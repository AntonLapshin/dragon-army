.PHONY: data bg misc sprites scale optimize zepp clean check help

# Guard: engine/*.js are generated from engine/*.ts (zeus bundles .js
# only). Regenerate and fail if the committed .js was stale.
check:
	npm test
	npm run build:engine
	git diff --quiet -- engine/

# Full data pipeline: raw/ -> assets/ -> assets/default.{b,r,s}
data: frame icon bg misc sprites coin energy_bar stars equipment fight villages scale optimize zepp

# frame
frame:
	mkdir -p assets/misc
	cp raw/frame.png assets/misc/frame.png

# 0) Icon raw/ -> assets/
icon:
	cp raw/icon.png assets/icon.png

# 1) Backgrounds: raw/ -> assets/bg/
bg:
	mkdir -p assets/bg
	cp raw/bg-dragon.png assets/bg/bg-dragon.png
	cp raw/bg-home.png assets/bg/bg-home.png

# 2) Shadow: raw/ -> assets/misc/
misc:
	mkdir -p assets/misc
	cp raw/shadow.png assets/misc/shadow.png

# 3) Sprite sheets -> individual PNGs (must run from sprites/ dir),
# then drop unused "_" placeholders.
sprites:
	cd sprites && venv/bin/python -m spritecut.cli ../raw/ui-icons.png -s 96x96 -n "egg _coin _energy sell victory loss danger training strength dice home coin _shop _monster bewilder_beast close" -o ../assets/ui -g 4x4 --margin 0
	cd sprites && venv/bin/python -m spritecut.cli ../raw/eggs.png -s 300x300 -n "night_fury light_fury light_night night_light wooly_howl deadly_nadder razorwhip triple_stryke stormcutter songwing monstrous_nightmare skrill gronkle hideous_zippleback windwalker snowtail" -o ../assets/eggs -g 4x4 --margin 0
	cd sprites && venv/bin/python -m spritecut.cli ../raw/dragons.png -s 300x300 -n "night_fury light_fury light_night night_light wooly_howl deadly_nadder razorwhip triple_stryke stormcutter songwing monstrous_nightmare skrill gronkle hideous_zippleback windwalker snowtail" -o ../assets/dragons -g 4x4 --margin 0 --valign bottom
	cd sprites && venv/bin/python -m spritecut.cli ../raw/monsters.png -s 128x128 -n "bewilder_beast gronkle deadly_nadder monstrous_nightmare" -o ../assets/monsters -g 2x2 --margin 0
	rm -f assets/ui/_*.png assets/eggs/_*.png assets/dragons/_*.png assets/monsters/_*.png

coin:
	cp raw/coin.png assets/ui/coin.png

energy_bar:
	cp raw/energy_bar.png assets/ui/energy_bar.png

stars:
	cp raw/silver_star.png assets/ui/silver_star.png
	cp raw/gold_star.png assets/ui/gold_star.png

# 3b) Equipment: raw/equipment/ -> assets/ui/ (scaled by `scale` per assets.json)
equipment:
	cp raw/equipment/helm.png assets/ui/helm.png
	cp raw/equipment/wing-guards.png assets/ui/wing_guards.png
	cp raw/equipment/tail-guard.png assets/ui/tail_guard.png
	cp raw/equipment/leg-guard.png assets/ui/leg_guard.png
	cp raw/equipment/button.png assets/ui/equipment.png

# 3c) Fight FX: raw/fight/ -> assets/ui/ (scaled by `scale` per assets.json)
fight:
	cp raw/fight/fireball.png assets/ui/fireball.png
	cp raw/fight/impact.png assets/ui/impact.png

# 3d) Villages: raw/villages/ -> assets/ui/ (scaled by `scale` per assets.json)
villages:
	cp raw/villages/map.png assets/ui/map.png
	cp raw/villages/checkmark.png assets/ui/checkmark.png
	cp raw/villages/village-outpost.png assets/ui/village-outpost.png
	cp raw/villages/village-hamlet.png assets/ui/village-hamlet.png
	cp raw/villages/village-stronghold.png assets/ui/village-stronghold.png

# 4) Scale all PNGs to their exact widget sizes per assets.json
# (e.g. dragons/songwing.png -> songwing_60x60.png + songwing_240x240.png),
# deleting the originals. Must run before optimize so optimize compresses
# the final exact-size images (Zepp OS draws IMG 1:1, no runtime scaling).
scale:
	node optimize/resize.mjs assets assets.json

# 5) Optimize all PNGs in place (sharp-based, see optimize/README.md).
optimize:
	node optimize/optimize.mjs assets

# 6) Zepp OS per-device variants (mirrors koala: identical
# assets/default.b, assets/default.r, assets/default.s).
zepp:
	rm -rf assets/default.b assets/default.r assets/default.s
	mkdir -p assets/default.b assets/default.r assets/default.s
	for d in assets/default.b assets/default.r assets/default.s; do \
		cp -r assets/bg assets/dragons assets/eggs assets/misc assets/monsters assets/ui "$$d/"; \
		cp assets/icon.png "$$d/icon.png"; \
	done

clean:
	rm -rf assets/bg assets/misc assets/ui assets/eggs assets/dragons assets/monsters
	rm -rf assets/default.b assets/default.r assets/default.s

help:
	@echo "Targets:"
	@echo "  make data      - full pipeline: icon + bg + misc + sprites + scale + optimize + zepp"
	@echo "  make check     - tests + regenerate engine JS (fails if .js is stale)"
	@echo "  make icon      - copy icon raw/ -> assets/"
	@echo "  make bg        - copy backgrounds raw/ -> assets/bg/"
	@echo "  make misc      - copy shadow raw/ -> assets/misc/"
	@echo "  make sprites   - cut sprite sheets raw/ -> assets/{ui,eggs,dragons,monsters}/"
	@echo "  make fight     - copy fight FX raw/fight/ -> assets/ui/"
	@echo "  make villages  - copy village art raw/villages/ -> assets/ui/"
	@echo "  make scale     - scale PNGs to exact widget sizes per assets.json (deletes originals)"
	@echo "  make optimize  - optimize PNGs in assets/ in place"
	@echo "  make zepp      - build assets/default.{b,r,s} device variants"
	@echo "  make clean     - remove generated assets"
