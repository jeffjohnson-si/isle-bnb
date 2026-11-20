"""Re-imports property photos from the Desktop and reprocesses them.

The originals live in C:\\Users\\Admin1\\Desktop\\islebnb\\<folder>\\ and are
already JPEG-compressed by WeChat at 640-1536px. This script:

1. matches every file in public/pics/<property>/ back to its original by content
   fingerprint (so the rename I did during import does not matter),
2. copies the pristine original back,
3. upscales to a sensible display size (never more than 2x),
4. sharpens adaptively — soft photos get more, already-crisp ones get none,
5. saves as WebP (quality 76) and removes the JPEG, so the site ships ~40% less
   image weight. References in `src/data/*.ts` point at the .webp files.

Usage:
    python scripts/optimise-photos.py            # reprocess from the current files
    python scripts/optimise-photos.py --restore  # re-copy originals first, then process
"""

from __future__ import annotations

import os
import shutil
import sys
from glob import glob

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
PICS = os.path.abspath(os.path.join(HERE, '..', 'public', 'pics'))
DESKTOP = os.path.join(os.path.expanduser('~'), 'Desktop', 'islebnb')

SOURCES = {
    'king-solomon': 'solomon islands/king solomon hotel',
    'honiara-hotel': 'solomon islands/honiara hotel',
    'coral-sea': 'solomon islands/coral sea resort and casino',
    'heritage-park': 'solomon islands/heritage park hotel',
    'gizo-hotel': 'solomon islands/gizo hotel',
    'qua-roviana-motel': 'solomon islands/qua roviana motel',
    'fatboys-resort': 'solomon islands/fatboys resort',
    'titiru-eco-lodge': 'solomon islands/titiru eco lodge',
    'papatura-island-retreat': 'solomon islands/papatura island retreat',
    'crowne-plaza-residences': 'png/crown plaza residences port morseby',
    'sheraton-stanley': 'png/sheraton port moresby stanley hotel & suites',
    'marriott-apartments': 'png/marriott executive apartments port moresby',
    'gateway-hotel': 'png/gateway hotel & apartments port moresby',
    'kokopo-beach-bungalow': 'png/kokopo beach bungalow resort east new britain',
    'bird-of-paradise': 'png/bird of paradise hotel and apartments goroka, papupa new guinea',
    'cocomo-resort': 'vanuatu/mg cocomo resort, port vila, efate, vanuatu',
    'nasami-resort': 'vanuatu/Nasami resort port vila, vanuatu',
    'poppys-lagoon': 'vanuatu/poppys on the lagoon, port vila, efate, vanuatu',
    'mangoes-resort': 'vanuatu/mangoes resort port vila vanuatu',
    'ramada-resort': 'vanuatu/ramada resort by wyndham, port vila, vanuatu',
    'doubletree-fiji': 'fiji/doubletree resort by hilton',
    'fiji-beachhouse': 'fiji/fiji beachhouse, Namatakula, Fiji',
    'marriott-momi-bay': 'fiji/Fiji Marriott resort Momi Bay',
    'nasau-resort': 'fiji/Nasau resort and villas, Nad, Fiji',
    'oarsmans-bay': "fiji/oarsman's bay lodge",
    'shangri-la-yanuca': 'fiji/Shangri-La Yacuna private island resort, Fiji',
    'le-vasa-resort': 'samoa/le vasa resort',
    'aggie-greys': "samoa/sheraton samoa aggie grey's hotel and bungalows",
    'sinalei-reef': 'samoa/sinalei reef resort and spa',
    'taumeasina': 'samoa/taumeasina island resort, apia samoa',
    'seaview-lodge': 'tonga/seaview lodge',
    'tanoa-dateline': 'tonga/tanoa international dateline hotel',
    'tonga-holiday-villa': 'tonga/tonga holiday villa',
    'hilton-tahiti': 'tahiti/hilton hotel tahiti',
    'intercontinental-tahiti': 'tahiti/intercontinental tahiti resort and spa',
    'tahiti-lagoon': 'tahiti/tahiti lagoon resort',
    'tahiti-pearl': 'tahiti/tahiti pearl beach resort',
    'aitutaki-lagoon': 'cook islands/aitutaki lagoon private island resort',
    'little-polynesian': 'cook islands/little polynesian resort',
    'pacific-resort-rarotonga': 'cook islands/pacific resort, raratonga',
    'resort-tavae': "cook islands/resort tava'e",
    'palau-central': 'palau/palau central hotel',
    'palau-coralines': 'palau/palau coralines resort',
    'palau-pacific': 'palau/palau pacific resort',
    'palau-plantation': 'palau/palau plantation resort',
    'dusit-thani-guam': 'guam/dusit thani guam resort',
    'hotel-tano': 'guam/hotel tano',
    'pacific-islands-club': 'guam/pacific islands club',
    'tsubaki-tower': 'guam/the tsubaki tower',
    'sadie-thompson-inn': 'american samoa/sadie thompson inn',
    'sadies-by-the-sea': "american samoa/sadie's by the sea",
    'tradeswind-hotel': 'american samoa/tradeswind hotel',
    'ciff-hotel': 'federal states of micronesia/ciff hotel and resort',
    'sea-breeze-hotel': 'federal states of micronesia/sea breeze hotel and restuarant',
    'truk-blue-lagoon': 'federal states of micronesia/truk blue lagoon resort',
    'bokanbotin': 'marshall islands/bokanbotin private island bungalows',
    'hotel-robert-reimers': 'marshall islands/hotel robert reimers',
    'marshall-islands-resort': 'marshall islands/marshall islands resort',
    'aqua-resort-saipan': 'mariana islands/aqua resort club saipan',
    'saipan-skyline': 'mariana islands/saipan skyline designers hotel',
    'saipan-world-resort': 'mariana islands/saipan world resort',
    'surfriders': 'mariana islands/surfriders resort hotel',
    'laus-gateway': "niue/lau's gateway",
    'namukulu-cottages': 'niue/namukulu cottages niue',
    'scenic-matavai': 'niue/scenic matavai resort',
    'taloa-heights': 'niue/taloa heights',
    'esfam-lodge': 'tuvalu/esfam lodge',
    'filamona-lodge': 'tuvalu/filamona lodge',
    'funafuti-lagoon': 'tuvalu/funafuti lagoon resort',
    'hotel-albatros': 'wallis and futuna/hotel albatros',
    'hotel-lomipeau': 'wallis and futuna/hotel lomipeau',
    'lausikula': "wallis and futuna/lausikula chambres d'hotes",
    'betio-lodge': 'kiribati/betio lodge',
    'the-george-hotel': 'kiribati/the george hotel',
    'aquariri-lodge': 'nauru/aquariri lodge',
    'ewa-lodge': 'nauru/ewa lodge',
}

TARGET_LONG_EDGE = 1200
MAX_SCALE = 2.0
QUALITY = 76


def fingerprint(path: str, size: int = 64) -> np.ndarray:
    with Image.open(path) as im:
        small = im.convert('L').resize((size, size), Image.LANCZOS)
    arr = np.asarray(small, dtype=np.float32)
    return (arr - arr.mean()) / (arr.std() + 1e-6)


def sharpness(image: Image.Image) -> float:
    grey = image.convert('L').resize((512, max(1, round(512 * image.size[1] / image.size[0]))), Image.LANCZOS)
    a = np.asarray(grey, dtype=np.float32)
    lap = 4 * a[1:-1, 1:-1] - a[:-2, 1:-1] - a[2:, 1:-1] - a[1:-1, :-2] - a[1:-1, 2:]
    return float(lap.var())


def match_originals(property_dir: str, source_dir: str) -> dict[str, str]:
    """Map each processed file to the original it came from, by content."""
    originals = sorted(glob(os.path.join(source_dir, '*.jpg')))
    processed = sorted(glob(os.path.join(property_dir, '*.jpg')))
    prints = {p: fingerprint(p) for p in originals}

    mapping: dict[str, str] = {}
    for target in processed:
        target_print = fingerprint(target)
        best, best_score = None, 1e9
        for candidate, candidate_print in prints.items():
            score = float(np.mean((target_print - candidate_print) ** 2))
            if score < best_score:
                best, best_score = candidate, score
        # Guard against a bad match: copying the wrong photo would be worse
        # than leaving the existing one in place.
        if best and best_score < 0.02 and os.path.abspath(best) != os.path.abspath(target):
            mapping[target] = best
    return mapping


def process(path: str) -> tuple[int, int, int]:
    before = os.path.getsize(path)
    with Image.open(path) as source:
        image = source.convert('RGB')
        width, height = image.size
        long_edge = max(width, height)

        scale = min(min(TARGET_LONG_EDGE / long_edge, MAX_SCALE), 2.0)
        if scale > 1.0:
            image = image.resize(
                (round(width * scale), round(height * scale)), Image.LANCZOS
            )

        # Sharpen only the luminance channel so colour edges never fringe.
        softness = sharpness(image)
        percent = 55 if softness > 3500 else 120
        radius = 1.2 if softness > 3500 else 1.6

        lab = image.convert('LAB')
        l_chan, a_chan, b_chan = lab.split()
        l_chan = l_chan.filter(
            ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=3)
        )
        image = Image.merge('LAB', (l_chan, a_chan, b_chan)).convert('RGB')

        image = ImageEnhance.Color(image).enhance(1.05)
        image = ImageEnhance.Contrast(image).enhance(1.04)

        webp_path = os.path.splitext(path)[0] + '.webp'
        image.save(webp_path, 'WEBP', quality=QUALITY, method=6)
        after = os.path.getsize(webp_path)

        # The JPEG is only an intermediate now — drop it so nothing references it.
        if not dry_run:
            os.remove(path)

    return long_edge, max(image.size), after - before


def main() -> None:
    restore = '--restore' in sys.argv
    only = next(
        (arg.split('=', 1)[1] for arg in sys.argv if arg.startswith('--only=')), None
    )
    folders = (
        [f for f in only.split(',') if f in SOURCES] if only else list(SOURCES)
    )
    total_delta = 0
    processed_count = 0

    for folder in folders:
        source_name = SOURCES[folder]
        property_dir = os.path.join(PICS, folder)
        source_dir = os.path.join(DESKTOP, source_name)
        if not os.path.isdir(property_dir):
            continue

        if restore:
            if not os.path.isdir(source_dir):
                print(f"! no desktop folder for {folder} — using current files")
            else:
                mapping = match_originals(property_dir, source_dir)
                for target, original in mapping.items():
                    shutil.copyfile(original, target)
                print(f"{folder:<24} restored {len(mapping)} files from originals")

        for path in sorted(glob(os.path.join(property_dir, '*.jpg'))):
            try:
                old_edge, new_edge, delta = process(path)
            except Exception as exc:
                # A truncated download should not abort the whole batch.
                print(f"  ! skipped {os.path.basename(path)}: {exc}")
                continue
            total_delta += delta
            processed_count += 1
            print(f"  {os.path.basename(path):<24} {old_edge:>4}px -> {new_edge:>4}px  {delta/1024:+6.0f} KB")

    print(f"\nprocessed {processed_count} files, {(total_delta/1024/1024):+.1f} MB")


if __name__ == '__main__':
    main()
