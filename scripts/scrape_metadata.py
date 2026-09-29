#!/usr/bin/env python3
"""
Retro-Pi Hub Metadata & Boxart Scraper
Scrapes missing high-resolution boxarts from libretro-thumbnails and
descriptions from Wikipedia (PT-BR first, fallback to EN).
"""

import os
import sys
import re
import time
import json
import argparse
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from xml.dom import minidom

SYSTEM_REPOS = {
    'psx': 'Sony_-_PlayStation',
    'mastersystem': 'Sega_-_Master_System_-_Mark_III',
    'gba': 'Nintendo_-_Game_Boy_Advance',
    'gb': 'Nintendo_-_Game_Boy',
    'gbc': 'Nintendo_-_Game_Boy_Color',
    'nes': 'Nintendo_-_Nintendo_Entertainment_System',
    'snes': 'Nintendo_-_Super_Nintendo_Entertainment_System',
    'n64': 'Nintendo_-_Nintendo_64',
    'sega32x': 'Sega_-_32X',
    'genesis': 'Sega_-_Mega_Drive_-_Genesis',
    'megadrive': 'Sega_-_Mega_Drive_-_Genesis'
}

HEADERS = {
    'User-Agent': 'RetroPiHubScraper/1.0 (https://github.com/mailsonm/retro-pi-hub)'
}

ROM_EXTENSIONS = {
    'psx': ['.pbp', '.cue', '.chd', '.iso', '.bin'],
    'mastersystem': ['.sms', '.zip'],
    'gba': ['.gba', '.zip'],
    'gb': ['.gb', '.zip'],
    'gbc': ['.gbc', '.zip'],
    'nes': ['.nes', '.zip'],
    'snes': ['.smc', '.sfc', '.zip'],
    'n64': ['.n64', '.v64', '.z64', '.zip'],
    'sega32x': ['.32x', '.zip'],
    'genesis': ['.bin', '.gen', '.md', '.smd', '.zip'],
    'megadrive': ['.bin', '.gen', '.md', '.smd', '.zip']
}

def clean_game_title(filename):
    base = os.path.splitext(filename)[0]
    # Remove bracketed tags like [T-Por], [!], etc.
    clean = re.sub(r'\s*\[[^\]]*\]\s*', ' ', base)
    # Remove parenthesized tags like (USA), (Europe), (Brazil), etc.
    clean = re.sub(r'\s*\([^\)]*\)\s*', ' ', clean)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean or base

def generate_boxart_candidates(repo_name, base_name, clean_title):
    candidates = [
        f"{base_name}.png",
        f"{clean_title} (USA).png",
        f"{clean_title} (USA, Europe).png",
        f"{clean_title} (Europe).png",
        f"{clean_title} (Brazil).png",
        f"{clean_title} (World).png",
        f"{clean_title} (Japan).png",
        f"{clean_title}.png",
    ]

    # Roman to Arabic and Arabic to Roman variations
    roman_map = [
        (' VIII', ' 8'), (' VII', ' 7'), (' VI', ' 6'), (' IV', ' 4'),
        (' III', ' 3'), (' II', ' 2'), (' IX', ' 9'), (' V', ' 5')
    ]
    for rom, ara in roman_map:
        if rom in clean_title:
            alt = clean_title.replace(rom, ara)
            candidates.extend([f"{alt} (USA).png", f"{alt} (Europe).png", f"{alt}.png"])
        elif ara in clean_title:
            alt = clean_title.replace(ara, rom)
            candidates.extend([f"{alt} (USA).png", f"{alt} (Europe).png", f"{alt}.png"])

    # Disc variation (e.g., PaRappa the Rapper (USA) (Disc 1))
    candidates.append(f"{clean_title} (USA) (Disc 1).png")
    candidates.append(f"{clean_title} (Europe) (Disc 1).png")

    urls = []
    base_url = f"https://raw.githubusercontent.com/libretro-thumbnails/{repo_name}/master/Named_Boxarts/"
    for cand in candidates:
        quoted = urllib.parse.quote(cand)
        urls.append((base_url + quoted, cand))
    return urls

def download_boxart(repo_name, base_name, clean_title, dest_path):
    if os.path.exists(dest_path):
        return True

    candidates = generate_boxart_candidates(repo_name, base_name, clean_title)
    for url, cand_name in candidates:
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=8) as resp:
                if resp.status == 200:
                    data = resp.read()
                    if len(data) > 1024:
                        with open(dest_path, 'wb') as f:
                            f.write(data)
                        print(f"  [Cover ✓] Downloaded boxart from {cand_name}")
                        return True
        except Exception:
            pass
        time.sleep(0.05)
    return False

def get_wiki_summary(title, system_label=""):
    search_terms = [title]
    if system_label:
        search_terms.append(f"{title} ({system_label})")
        search_terms.append(f"{title} video game")

    for lang in ['pt', 'en']:
        for term in search_terms:
            search_url = f"https://{lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(term)}&format=json"
            try:
                req = urllib.request.Request(search_url, headers=HEADERS)
                with urllib.request.urlopen(req, timeout=6) as res:
                    data = json.loads(res.read().decode('utf-8'))
                    results = data.get('query', {}).get('search', [])
                    if results:
                        page_title = results[0]['title']
                        summary_url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(page_title)}"
                        req2 = urllib.request.Request(summary_url, headers=HEADERS)
                        with urllib.request.urlopen(req2, timeout=6) as res2:
                            s_data = json.loads(res2.read().decode('utf-8'))
                            extract = s_data.get('extract')
                            if extract and len(extract) > 40:
                                return extract.strip()
            except Exception:
                pass
            time.sleep(0.05)
    return None


def process_system(roms_dir, system):
    repo_name = SYSTEM_REPOS.get(system)
    if not repo_name:
        print(f"Skipping unknown system {system}")
        return

    sys_dir = os.path.join(roms_dir, system)
    if not os.path.isdir(sys_dir):
        return

    images_dir = os.path.join(sys_dir, 'images')
    os.makedirs(images_dir, exist_ok=True)

    gamelist_path = os.path.join(sys_dir, 'gamelist.xml')
    gamelist_map = {}
    xml_tree = None
    root_elem = None

    if os.path.exists(gamelist_path):
        try:
            xml_tree = ET.parse(gamelist_path)
            root_elem = xml_tree.getroot()
            for game in root_elem.findall('game'):
                path_elem = game.find('path')
                if path_elem is not None and path_elem.text:
                    rel_p = path_elem.text.replace('./', '').strip()
                    gamelist_map[rel_p] = game
        except Exception as e:
            print(f"Warning parsing {gamelist_path}: {e}")

    if root_elem is None:
        root_elem = ET.Element('gameList')
        xml_tree = ET.ElementTree(root_elem)

    valid_exts = tuple(ROM_EXTENSIONS.get(system, ['.zip']))
    files = sorted([f for f in os.listdir(sys_dir) if f.lower().endswith(valid_exts) and not f.startswith('.')])

    print(f"\n==========================================")
    print(f"Processing {system.upper()} ({len(files)} ROMs)...")
    print(f"==========================================")

    modified = False

    for file_name in files:
        base_name = os.path.splitext(file_name)[0]
        clean_title = clean_game_title(file_name)
        game_elem = gamelist_map.get(file_name)

        if game_elem is None:
            game_elem = ET.SubElement(root_elem, 'game')
            p_elem = ET.SubElement(game_elem, 'path')
            p_elem.text = f"./{file_name}"
            n_elem = ET.SubElement(game_elem, 'name')
            n_elem.text = clean_title
            gamelist_map[file_name] = game_elem
            modified = True

        # Check Artwork
        img_elem = game_elem.find('image')
        has_boxart = bool(img_elem is not None and img_elem.text and os.path.exists(os.path.join(sys_dir, img_elem.text.replace('./', ''))))

        target_img_rel = f"./images/{base_name}-image.png"
        target_img_abs = os.path.join(sys_dir, 'images', f"{base_name}-image.png")

        if not has_boxart:
            # Check if image already exists under common patterns in images_dir
            found_local = False
            for ext in ['.png', '.jpg', '-image.png', '-image.jpg', '-thumb.png', '-thumb.jpg']:
                candidate_local = os.path.join(images_dir, base_name + ext)
                if os.path.exists(candidate_local):
                    if img_elem is None:
                        img_elem = ET.SubElement(game_elem, 'image')
                    img_elem.text = f"./images/{base_name}{ext}"
                    found_local = True
                    modified = True
                    break

            if not found_local:
                downloaded = download_boxart(repo_name, base_name, clean_title, target_img_abs)
                if downloaded:
                    if img_elem is None:
                        img_elem = ET.SubElement(game_elem, 'image')
                    img_elem.text = target_img_rel
                    modified = True

        # Check Description
        desc_elem = game_elem.find('desc')
        has_desc = bool(desc_elem is not None and desc_elem.text and len(desc_elem.text.strip()) > 20)

        if not has_desc:
            print(f"  [Desc ...] Fetching summary for '{clean_title}'...")
            summary = get_wiki_summary(clean_title, system)
            if summary:
                if desc_elem is None:
                    desc_elem = ET.SubElement(game_elem, 'desc')
                desc_elem.text = summary
                print(f"  [Desc ✓] Added synopsis ({len(summary)} chars)")
                modified = True

    if modified:
        # Pretty print and save XML
        rough_string = ET.tostring(root_elem, 'utf-8')
        reparsed = minidom.parseString(rough_string)
        pretty_xml = reparsed.toprettyxml(indent="\t")
        # Remove extra blank lines generated by minidom
        clean_xml = "\n".join([line for line in pretty_xml.split("\n") if line.strip()])
        with open(gamelist_path, 'w', encoding='utf-8') as f:
            f.write(clean_xml)
        print(f"Successfully updated {gamelist_path}!")
    else:
        print(f"No changes required for {system}.")

def main():
    parser = argparse.ArgumentParser(description="Retro-Pi Hub Metadata & Boxart Scraper")
    parser.add_argument('--roms-dir', default='/home/pi/RetroPie/roms', help="Path to ROMs directory")
    parser.add_argument('--system', help="Specific system to process (default: all)")
    args = parser.parse_args()

    systems = [args.system] if args.system else ['psx', 'mastersystem', 'gba', 'nes', 'gb', 'gbc', 'snes', 'n64', 'sega32x', 'genesis']
    for sys_name in systems:
        process_system(args.roms_dir, sys_name)

if __name__ == '__main__':
    main()
