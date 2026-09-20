"""Command line interface for spritecut."""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import List, Optional, Sequence

from . import version
from .imaging import BackgroundSpec, parse_color, parse_grid, parse_size
from .pipeline import CutOptions, cut_sprites, write_manifest

PROG = "spritecut"

EPILOG = """\
examples:
  # 2x2 sheet -> four 64x64 icons, names read left-to-right / top-to-bottom
  spritecut sheet.png -s 64x64 -n "play pause stop record" -o out/

  # names from a file (one per line), non-square output, a bit of breathing room
  spritecut icons.png -s 128x96 -N names.txt -o assets/ --padding 6 --margin 0.08

  # state the layout explicitly (most reliable) and write a debug preview
  spritecut sheet.png -s 32 -g 4x4 -N names.txt --preview

  # dark sheet: light art on #101014
  spritecut sheet.png -s 48 -N names.txt --remove-bg --bg-color '#101014' --color-tolerance 30

  # a manifest for your build script
  spritecut sheet.png -s 64 -N names.txt --manifest sprites/manifest.json --json

  # no sheet at hand? verify the installation:
  spritecut --self-test
"""


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog=PROG,
        description=(
            "Cut a grid sprite sheet (icons on a white or transparent background) into "
            "individual, centred PNGs that all share one size. "
            "The sheet background is kept by default; pass --remove-bg to "
            "replace white with transparency."
        ),
        epilog=EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument("input", nargs="?", help="path to the sprite sheet (png, jpg, webp, ...)")
    parser.add_argument("-V", "--version", action="version", version=f"{PROG} {version}")
    parser.add_argument(
        "--self-test", action="store_true",
        help="generate a sample sheet, cut it, verify the output and exit",
    )

    what = parser.add_argument_group("what to cut")
    what.add_argument("-s", "--size", metavar="WxH",
                      help="output size of every sprite, e.g. 64x64 (one number means square)")
    what.add_argument("-n", "--names", action="append", default=[], metavar="LIST",
                      help="icon names left-to-right / top-to-bottom, space or comma separated; "
                           "repeat the flag or use -N for long lists")
    what.add_argument("-N", "--names-file", metavar="FILE",
                      help="file with one icon name per line (# comments allowed)")
    what.add_argument("-o", "--out", default="sprites", metavar="DIR",
                      help="output directory (default: %(default)s)")

    layout = parser.add_argument_group("layout & detection")
    layout.add_argument("-g", "--grid", metavar="ROWSxCOLS",
                        help="known layout, e.g. 4x4 or 2x8 - skips auto detection, fixes the order")
    layout.add_argument("-p", "--padding", type=int, default=4, metavar="PX",
                        help="extra source pixels kept around each icon before scaling (default: %(default)s)")
    layout.add_argument("--merge-distance", type=float, default=0.0, metavar="PX",
                        help="merge blobs closer than PX pixels - for multi-part icons (default: off)")
    layout.add_argument("--merge-max-factor", type=float, default=1.6, metavar="FACTOR",
                        help="never merge two blobs into a box wider/taller than FACTOR x the typical "
                             "icon - keeps neighbours apart (default: %(default)s; 0 disables the guard)")
    layout.add_argument("--no-split-merged", dest="split_merged", action="store_false",
                        help="do not split boxes that swallowed several icons back apart")
    layout.set_defaults(split_merged=True)
    layout.add_argument("--row-tolerance", type=float, default=None, metavar="PX",
                        help="vertical slack when grouping icons into rows (default: from icon height)")
    layout.add_argument("--min-area", type=int, default=8, metavar="PX",
                        help="ignore blobs with fewer than PX foreground pixels (default: %(default)s)")
    layout.add_argument("--min-size", type=int, default=2, metavar="PX",
                        help="ignore blobs narrower or shorter than PX pixels (default: %(default)s)")
    layout.add_argument("--min-relative-area", type=float, default=0.15, metavar="FACTOR",
                        help="ignore blobs smaller than FACTOR x the median icon area - "
                             "icons on a sheet share one size, dust does not "
                             "(default: %(default)s; 0 disables)")

    bg = parser.add_argument_group("background removal (off by default)")
    bg_toggle = bg.add_mutually_exclusive_group()
    bg_toggle.add_argument("--remove-bg", dest="remove_bg", action="store_true", default=None,
                    help="replace the sheet background with transparency")
    bg_toggle.add_argument("--keep-bg", "--no-remove-bg", dest="remove_bg", action="store_false",
                    help="keep the sheet background as-is (default)")
    bg.add_argument("--white-threshold", type=int, default=244, metavar="0-255",
                    help="channel value from which a pixel counts as white (default: %(default)s; "
                         "implies --remove-bg when changed)")
    bg.add_argument("--alpha-threshold", type=int, default=8, metavar="0-255",
                    help="alpha below which a pixel counts as transparent (default: %(default)s)")
    bg.add_argument("--feather", type=int, default=8, metavar="0-255",
                    help="softness of the cut edge, 0 = hard cut (default: %(default)s; only with --remove-bg)")
    bg.add_argument("--no-defringe", action="store_true",
                    help="keep the whitish halo on semi transparent edge pixels (only with --remove-bg)")
    bg.add_argument("--bg-color", metavar="#RRGGBB",
                    help="use this colour instead of white as the sheet background (implies --remove-bg)")
    bg.add_argument("--color-tolerance", type=int, default=24, metavar="0-255",
                    help="tolerance for --bg-color and for near-white greys (default: %(default)s)")

    out = parser.add_argument_group("output")
    out.add_argument("-m", "--margin", type=float, default=0.05, metavar="FRACTION",
                     help="empty border around the art inside the canvas, 0-0.45 (default: %(default)s)")
    out.add_argument("--fit", choices=("contain", "stretch"), default="contain",
                     help="contain keeps the aspect ratio (default), stretch fills WxH exactly")
    out.add_argument("--resample",
                     choices=("nearest", "box", "bilinear", "hamming", "bicubic", "lanczos"),
                     default="lanczos",
                     help="resampling filter used when scaling (default: %(default)s)")
    out.add_argument("--out-bg", default="transparent", metavar="transparent|#RRGGBB",
                     help="background of the written files (default: transparent)")
    out.add_argument("--template", default="{name}.png", metavar="PATTERN",
                     help="file name pattern; {name} and {index} are substituted (default: %(default)s)")
    out.add_argument("--start-index", type=int, default=1,
                     help="first {index} value (default: %(default)s)")
    clobber = out.add_mutually_exclusive_group()
    clobber.add_argument("--no-clobber", dest="clobber", action="store_false",
                         help="fail instead of overwriting existing files")
    clobber.add_argument("--overwrite", "--force", dest="clobber", action="store_true",
                         help="overwrite existing files (default)")
    out.set_defaults(clobber=True)
    out.add_argument("--auto-name", action="store_true",
                     help="name leftover icons icon-01, icon-02, ...")

    feedback = parser.add_argument_group("feedback")
    feedback.add_argument("--preview", nargs="?", const="", default=None, metavar="FILE",
                          help="write a debug sheet with the detected boxes and reading order")
    feedback.add_argument("--manifest", metavar="FILE",
                          help="write a JSON manifest of every sprite")
    feedback.add_argument("--json", action="store_true",
                          help="print the result as JSON instead of a table")
    feedback.add_argument("--dry-run", action="store_true",
                          help="detect and report only, write nothing")
    feedback.add_argument("-v", "--verbose", action="store_true",
                          help="chatty progress output on stderr")
    feedback.add_argument("-q", "--quiet", action="store_true", help="only errors")
    return parser


def split_names(chunks: Sequence[str]) -> List[str]:
    names: List[str] = []
    for chunk in chunks:
        for token in str(chunk).replace(",", " ").split():
            token = token.strip().strip('"').strip("'")
            if token:
                names.append(token)
    return names


def names_from_file(path: str) -> List[str]:
    names: List[str] = []
    with open(path, "r", encoding="utf-8") as handle:
        for line in handle:
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            names.extend(split_names([stripped]))
    return names


def collect_names(args: argparse.Namespace) -> List[str]:
    names = split_names(args.names)
    if args.names_file:
        if not os.path.isfile(args.names_file):
            raise SystemExit(f"error: names file not found: {args.names_file}")
        names.extend(names_from_file(args.names_file))
    if not names:
        raise SystemExit('error: no names given - use -n "play pause" or -N names.txt')
    return names


def make_options(args: argparse.Namespace) -> CutOptions:
    background = BackgroundSpec(
        white_threshold=args.white_threshold,
        alpha_threshold=args.alpha_threshold,
        color=parse_color(args.bg_color) if args.bg_color else None,
        color_tolerance=args.color_tolerance,
        feather=max(0, args.feather),
        defringe=not args.no_defringe,
    )
    # Background removal is OFF by default. Explicit --remove-bg turns it on,
    # explicit --keep-bg/--no-remove-bg forces it off. For backward
    # compatibility, tuning knobs that only make sense with removal also
    # imply --remove-bg when the user changed them from their defaults.
    if args.remove_bg is True:
        remove_bg = True
    elif args.remove_bg is False:
        remove_bg = False
    else:
        remove_bg = bool(
            args.bg_color is not None
            or args.white_threshold != 244
            or args.alpha_threshold != 8
            or args.feather != 8
            or args.color_tolerance != 24
            or args.no_defringe
        )
    preview: Optional[str] = None
    if args.preview is not None:
        preview = args.preview or os.path.join(args.out, "_preview.png")
    return CutOptions(
        out_dir=args.out,
        size=parse_size(args.size),
        grid=parse_grid(args.grid) if args.grid else None,
        padding=max(0, args.padding),
        margin=args.margin,
        fit=args.fit,
        resample=args.resample,
        remove_bg=remove_bg,
        background=background,
        min_area=max(1, args.min_area),
        min_size=max(1, args.min_size),
        min_relative_area=max(0.0, args.min_relative_area),
        merge_distance=max(0.0, args.merge_distance),
        merge_max_factor=max(0.0, args.merge_max_factor),
        split_merged=args.split_merged,
        row_tolerance=args.row_tolerance,
        out_bg=args.out_bg,
        template=args.template,
        start_index=args.start_index,
        clobber=args.clobber,
        auto_name=args.auto_name,
        dry_run=args.dry_run,
        preview_path=preview,
    )


def print_table(results: List, size: Tuple[int, int], out_dir: str) -> None:
    width = max([len("name")] + [len(result.name) for result in results])
    print(f"{'#':>3}  {'name'.ljust(width)}  {'box @ source':>18}  {'src':>9}  scale  file")
    for result in results:
        x0, y0, x1, y1 = result.box
        box = f"{x0},{y0} {x1 - x0}x{y1 - y0}"
        src = f"{result.source_size[0]}x{result.source_size[1]}"
        print(
            f"{result.index:>3}  {result.name.ljust(width)}  {box:>18}  {src:>9}  "
            f"{result.scale:>5}x  {result.path}"
        )
    print(f"\n{len(results)} sprite(s) @ {size[0]}x{size[1]} -> {out_dir}/")


def print_dry_run(results: List, out_dir: str) -> None:
    width = max([len("name")] + [len(result.name) for result in results])
    print(f"dry run: {len(results)} sprite(s) would be written to {out_dir}/")
    for result in results:
        x0, y0, x1, y1 = result.box
        print(
            f"  {result.index:>3}. {result.name.ljust(width)}  box {x0},{y0} "
            f"{x1 - x0}x{y1 - y0}  src {result.source_size[0]}x{result.source_size[1]}"
        )


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.self_test:
        from .selftest import run_selftest

        return run_selftest(verbose=not args.quiet)

    if not args.input:
        parser.error("the INPUT sprite sheet is required (or run with --self-test)")
    if not args.size:
        parser.error("the -s/--size WxH argument is required")
    if not os.path.isfile(args.input):
        raise SystemExit(f"error: input not found: {args.input}")

    names = collect_names(args)
    options = make_options(args)
    verbose = args.verbose and not args.quiet

    def log(message: str) -> None:
        if verbose:
            print(message, file=sys.stderr)

    results = cut_sprites(args.input, names, options, log=log)

    if args.manifest:
        write_manifest(results, args.manifest, args.input, options)
        log(f"manifest -> {args.manifest}")

    if args.json:
        payload = {
            "input": os.path.abspath(args.input),
            "count": len(results),
            "size": {"w": options.size[0], "h": options.size[1]},
            "dry_run": options.dry_run,
            "sprites": [result.to_dict() for result in results],
        }
        print(json.dumps(payload, indent=2))
    elif options.dry_run:
        if not args.quiet:
            print_dry_run(results, options.out_dir)
    elif results and not args.quiet:
        print_table(results, options.size, options.out_dir)

    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())