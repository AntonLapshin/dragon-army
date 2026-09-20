.PHONY: data bg misc sprites scale optimize zepp clean help

# Full data pipeline: raw/ -> assets/ -> assets/default.{b,r,s}
data: frame icon bg misc sprites scale optimize zepp

# frame
frame:
	cp raw/frame.png assets/misc/frame.png

# 0) Icon raw/ -> assets/
icon:
	cp raw/icon.png assets/icon.png

# 1) Backgrounds: raw/ -> assets/bg/
bg:
	mkdir -p assets/bg
	cp raw/bg-dragon.png assets/bg/bg-dragon.png
	cp raw/bg-home.png assets/bg/bg-home.png

# 2) Overlay + shadow: raw/ -> assets/misc/
misc:
	mkdir -p assets/misc
	cp raw/overlay.png assets/misc/overlay.png
	cp raw/shadow.png assets/misc/shadow.png

# 3) Sprite sheets -> individual PNGs (must run from sprites/ dir),
# then drop unused "_" placeholders.
sprites:
	cd sprites && venv/bin/python -m spritecut.cli ../raw/ui-icons.png -s 96x96 -n "egg _coin energy sell victory loss danger training strength dice home coin _shop _monster bewilder_beast close" -o ../assets/ui -g 4x4 --margin 0
	cd sprites && venv/bin/python -m spritecut.cli ../raw/eggs.png -s 300x300 -n "night_fury light_fury light_night night_light wooly_howl deadly_nadder razorwhip triple_stryke stormcutter songwing monstrous_nightmare skrill gronkle hideous_zippleback windwalker snowtail" -o ../assets/eggs -g 4x4 --margin 0
	cd sprites && venv/bin/python -m spritecut.cli ../raw/dragons.png -s 300x300 -n "night_fury light_fury light_night night_light wooly_howl deadly_nadder razorwhip triple_stryke stormcutter songwing monstrous_nightmare skrill gronkle hideous_zippleback windwalker snowtail" -o ../assets/dragons -g 4x4 --margin 0
	cd sprites && venv/bin/python -m spritecut.cli ../raw/monsters.png -s 128x128 -n "bewilder_beast gronkle deadly_nadder monstrous_nightmare" -o ../assets/monsters -g 2x2 --margin 0
	rm -f assets/ui/_*.png assets/eggs/_*.png assets/dragons/_*.png assets/monsters/_*.png

# 4) Scale all PNGs to their exact widget sizes per assets.json
# (e.g. dragons/songwing.png -> songwing_60x60.png + songwing_240x240.png),
# deleting the originals. Must run before optimize so optimize compresses
# the final exact-size images (Zepp OS draws IMG 1:1, no runtime scaling).
scale:
	node optimize/resize.mjs assets assets.json
	node optimize/round-overlay.mjs assets assets.json

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
	@echo "  make icon      - copy icon raw/ -> assets/"
	@echo "  make icon      - copy icon raw/ -> assets/"
	@echo "  make bg        - copy backgrounds raw/ -> assets/bg/"
	@echo "  make misc      - copy overlay/shadow raw/ -> assets/misc/"
	@echo "  make sprites   - cut sprite sheets raw/ -> assets/{ui,eggs,dragons,monsters}/"
	@echo "  make scale     - scale PNGs to exact widget sizes per assets.json (deletes originals)"
	@echo "  make optimize  - optimize PNGs in assets/ in place"
	@echo "  make zepp      - build assets/default.{b,r,s} device variants"
	@echo "  make clean     - remove generated assets"
