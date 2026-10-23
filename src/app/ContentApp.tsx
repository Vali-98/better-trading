import { usePanelStore } from "../stores/panel";
import { BookmarksPanel } from "../features/bookmarks/BookmarksPanel";
import { useEffect, useState } from "react";
import { browser } from "wxt/browser";
const logo = browser.runtime.getURL("/assets/images/logo.png");
import { HistoryPanel } from "../features/HistoryPanel";
import { PinnedPanel } from "../features/PinnedPanel";
import { enhancerIds, useResultsStore } from "../stores/results";
import { Changelog, ReleaseHistory } from "../features/Changelog";
import { currentRelease } from "../lib/releases";
import { FlashMessages } from "../components/FlashMessages";
import { Icon } from "../components/Icon";

const pages = ["bookmarks", "pinned-items", "history"] as const;
export function ContentApp() {
  const { page, collapsed, setPage, toggleCollapsed } = usePanelStore();
  const [about, setAbout] = useState(false);
  useEffect(() => {
    const previous = document.body.style.paddingRight;
    document.body.style.paddingRight = collapsed ? "0px" : "400px";
    return () => {
      document.body.style.paddingRight = previous;
    };
  }, [collapsed]);
  return (
    <>
      <button
        className={`bt-expand ${collapsed ? "visible" : ""}`}
        onClick={toggleCollapsed}
        aria-label="Expand Better Trading"
      >
        ‹ <img src={logo} alt="" />
      </button>
      <aside
        aria-label="Better Trading"
        className={`bt-panel ${collapsed ? "collapsed" : ""}`}
      >
        <header className="bt-header">
          <button
            className="bt-header-button"
            onClick={toggleCollapsed}
            aria-label="Collapse Better Trading"
          >
            ›
          </button>
          <button className="bt-brand" onClick={() => setAbout(false)}>
            <img src={logo} alt="" />
            <span>Better Trading</span>
          </button>
          <button
            className="bt-header-button"
            onClick={() => setAbout(!about)}
            aria-label={about ? "Close about" : "About Better Trading"}
          >
            <Icon name={about ? "close" : "info"} />
          </button>
        </header>
        {!collapsed && (
          <>
            <Changelog />
            {!about && (
              <nav aria-label="Panel sections" className="bt-tabs">
                {pages.map((item) => (
                  <button
                    key={item}
                    aria-pressed={page === item}
                    onClick={() => {
                      setPage(item);
                      setAbout(false);
                    }}
                  >
                    {item === "bookmarks"
                      ? "▣ Bookmarks"
                      : item === "history"
                        ? "◷ History"
                        : "⚑ Pinned items"}
                  </button>
                ))}
              </nav>
            )}
            {about ? (
              <About />
            ) : page === "bookmarks" ? (
              <BookmarksPanel />
            ) : page === "history" ? (
              <HistoryPanel />
            ) : (
              <PinnedPanel />
            )}
          </>
        )}
        <FlashMessages />
      </aside>
    </>
  );
}
function About() {
  const { disabled, toggle } = useResultsStore();
  return (
    <section className="bt-about">
      <ReleaseHistory />
      <div className="bt-info-box">
        <h2>Better Trading</h2>
        <p>
          A better trading experience for Path of Exile and Path of Exile 2.
        </p>
      </div>
      <div className="bt-info-box">
        <h2>Enabled item result enhancers</h2>
        {enhancerIds.map((id) => (
          <label className="bt-setting-checkbox" key={id}>
            <input
              type="checkbox"
              checked={!disabled.includes(id)}
              onChange={() => toggle(id)}
            />{" "}
            {
              {
                "equivalent-pricings":
                  "Equivalent pricings (powered by poe.ninja)",
                "highlight-stat-filters": "Highlight searched mods",
                "maximum-sockets":
                  "Warning for armors that cannot be 6-socketed",
                "regroup-similars": "Regroup similar results",
              }[id]
            }
          </label>
        ))}
      </div>
      <div className="bt-info-box">
        <h2>GitHub</h2>
        <a
          href="https://github.com/poe-world/better-trading"
          className="bt-github-link"
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="github" /> View source and report issues here
        </a>
      </div>
      <div className="bt-info-box">
        <h2>Donate</h2>
        <p>Donate to keep this small fork alive.</p>
        <a href="https://ko-fi.com/W7W7X8T7W" target="_blank" rel="noreferrer">
          <img
            className="bt-kofi-button"
            src="https://storage.ko-fi.com/cdn/kofi6.png?v=6"
            alt="Buy Me a Coffee at ko-fi.com"
            height={36}
          />
        </a>
      </div>
      <div className="bt-info-box">
        <h2>Credits</h2>
        <p>
          This fork is mainatined by <strong>Vali-98</strong> (
          <a href="https://github.com/Vali-98">@Vali-98</a>). Better Trading was
          originally created by <strong>InfaMc</strong> (
          <a href="https://github.com/pboutin">@pboutin</a>) and was previously
          maintained by <strong>brosmike</strong> (
          <a href="https://github.com/dbjorge">@dbjorge</a>).
        </p>
      </div>
      <p className="bt-about-disclaimer">
        Better Trading is not affiliated with Grinding Gear Games.
      </p>
      <p className="bt-about-version">v{currentRelease.version}</p>
    </section>
  );
}
