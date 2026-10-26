.PHONY: fetch build deploy check release-drafts

fetch:
	bash scripts/fetch-sources.sh

build:
	bash build.sh

deploy:
	@test -n "$(TARGET)" || { echo "TARGET=/path/to/theme-directory is required" >&2; exit 2; }
	@$(MAKE) --no-print-directory build
	@mkdir -p "$(TARGET)"
	@cp theme.css manifest.json "$(TARGET)/"
	@echo "Deployed theme.css and manifest.json to $(TARGET)"

check:
	bash scripts/verify-build.sh

release-drafts:
	node scripts/prepare-release-drafts.mjs
