.DEFAULT_GOAL := help
.PHONY: help install dev dev-firefox check package package-chrome package-firefox upload-firefox check-upload-firefox

help:
	@printf '%s\n' 'make install                 Install dependencies' 'make dev / dev-firefox       Start development' 'make check                   Run type, test, and changelog checks' 'make package                 Package both browsers' 'make upload-firefox          Build and submit an existing AMO add-on for review' 'make check-upload-firefox    Validate local credentials without network calls'
install:
	npm ci
dev:
	npm run dev
dev-firefox:
	npm run dev:firefox
check:
	npm run typecheck
	npm test
	node --import tsx scripts/check-changelog.ts
package: package-chrome package-firefox
package-chrome:
	npm run zip
package-firefox:
	npm run zip:firefox
upload-firefox:
	node scripts/upload.mjs firefox
check-upload-firefox:
	node scripts/upload.mjs firefox --check
