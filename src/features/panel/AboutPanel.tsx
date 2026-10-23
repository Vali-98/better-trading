import type { ReactNode } from 'react'
import { Icon } from '../../components/Icon'
import { ReleaseHistory } from '../Changelog'
import { currentRelease } from '../../lib/releases'
import { enhancerIds, useResultsStore } from '../../stores/results'

const enhancerLabels = {
    'equivalent-pricings': 'Equivalent pricings (powered by poe.ninja)',
    'highlight-stat-filters': 'Highlight searched mods',
    'maximum-sockets': 'Warning for armors that cannot be 6-socketed',
    'regroup-similars': 'Regroup similar results',
}

export function AboutPanel() {
    const { disabled, toggle } = useResultsStore()
    return (
        <section className="bt-about">
            <ReleaseHistory />
            <InfoBox title="Better Trading">
                <p>A better trading experience for Path of Exile and Path of Exile 2.</p>
            </InfoBox>
            <InfoBox title="Enabled item result enhancers">
                {enhancerIds.map((id) => (
                    <label className="bt-setting-checkbox" key={id}>
                        <input
                            type="checkbox"
                            checked={!disabled.includes(id)}
                            onChange={() => toggle(id)}
                        />{' '}
                        {enhancerLabels[id]}
                    </label>
                ))}
            </InfoBox>
            <InfoBox title="GitHub">
                <a
                    href="https://github.com/poe-world/better-trading"
                    className="bt-github-link"
                    target="_blank"
                    rel="noreferrer">
                    <Icon name="github" /> View source and report issues here
                </a>
            </InfoBox>
            <InfoBox title="Donate">
                <p>Donate to keep this small fork alive.</p>
                <a href="https://ko-fi.com/W7W7X8T7W" target="_blank" rel="noreferrer">
                    <img
                        className="bt-kofi-button"
                        src="https://storage.ko-fi.com/cdn/kofi6.png?v=6"
                        alt="Buy Me a Coffee at ko-fi.com"
                        height={36}
                    />
                </a>
            </InfoBox>
            <InfoBox title="Credits">
                <p>
                    This fork is mainatined by <strong>Vali-98</strong> (
                    <a href="https://github.com/Vali-98">@Vali-98</a>). Better Trading was
                    originally created by <strong>InfaMc</strong> (
                    <a href="https://github.com/pboutin">@pboutin</a>) and was previously maintained
                    by <strong>brosmike</strong> (<a href="https://github.com/dbjorge">@dbjorge</a>
                    ).
                </p>
            </InfoBox>
            <p className="bt-about-disclaimer">
                Better Trading is not affiliated with Grinding Gear Games.
            </p>
            <p className="bt-about-version">v{currentRelease.version}</p>
        </section>
    )
}

function InfoBox({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="bt-info-box">
            <h2>{title}</h2>
            {children}
        </div>
    )
}
