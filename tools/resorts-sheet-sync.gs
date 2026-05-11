/**
 * Resort System spreadsheet → MasterBot-ready master tabs.
 *
 * Drop this file's contents into Extensions → Apps Script of the
 * "Resort System" spreadsheet, save, then run rebuildResortMaster()
 * from the editor. It will:
 *
 *   1. Walk every tab whose name looks like a resort (skips _meta /
 *      output / hidden tabs).
 *   2. Parse the known section headers (GATE, CONTACTS, COMMUNITY
 *      AMENITIES, POOL, TRASH, PARKING, PACKAGES, PETS, ELETRIC CAR)
 *      and pull the values it can recognise.
 *   3. Write a flat `resorts` tab (one row per resort) and a
 *      normalised `amenities` tab (one row per amenity).
 *
 * The output tabs are recreated each run, so it's safe to re-execute.
 * Cells the parser couldn't interpret are left blank — they're easy
 * to spot in the master tab and fill in by hand.
 */

const OUTPUT_RESORTS_TAB = "resorts";
const OUTPUT_AMENITIES_TAB = "amenities";

// Tabs to skip when scanning for resort brochures.
const SKIP_TAB_NAMES = new Set([
    OUTPUT_RESORTS_TAB,
    OUTPUT_AMENITIES_TAB,
    "_meta",
    "Meta",
    "README",
]);

const RESORT_COLUMNS = [
    "id",
    "name",
    "type",                  // primary | out-resort
    "clubhouse_address",
    "city",
    "state",
    "zip",
    "gate_system",           // proptia | gateaccess | attendant | other
    "gate_login_url",
    "gate_notes",
    "clubhouse_phone",
    "clubhouse_email",
    "gm_name",
    "gm_email",
    "gm_phone",
    "guardhouse_phone",
    "non_emergency_phone",
    "hoa_phone",
    "towing_phone",
    "pool_company",
    "pool_weekdays",
    "trash_location",
    "trash_days",
    "trash_notes",
    "parking_rules",
    "packages_policy",
    "pet_friendly",          // yes | no | conditional
    "pet_notes",
    "ev_charger",            // yes | no
    "amenity_fee_notes",
    "notes",
];

const AMENITY_COLUMNS = [
    "resort_id",
    "amenity_name",
    "hours",
    "access_code",
    "court",
    "fee",
];

// Tabs whose name does NOT look like a real resort brochure — they're
// templates, junk drawers, or system tabs. Anything in here is skipped.
const NON_RESORT_TABS = new Set([
    "Gates",          // index of gate systems, not a single resort
]);

// Heuristic: any tab whose slug matches one of these regexes is junk.
const NON_RESORT_PATTERNS = [
    /^sheet\d+$/i,            // Sheet127, Sheet129 etc.
    /^miami-?\d+-?\d+$/i,     // miami-60-3807
    /^copy-of-/i,             // duplicates left over from editing
];

// Tabs whose NAME starts with these prefixes count as "out-resort".
// Slugify lower-cases and dashifies — both "OUT - Foo" and "OUT-Foo"
// become "out-foo".
const OUT_RESORT_PREFIX_RE = /^out[-\s]/i;

function rebuildResortMaster() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tabs = ss.getSheets();

    const masterRows = [];
    const amenityRows = [];

    for (const tab of tabs) {
        const name = tab.getName();
        if (SKIP_TAB_NAMES.has(name)) continue;
        if (NON_RESORT_TABS.has(name)) continue;
        if (name.startsWith("_") || name.startsWith(".")) continue;
        const id = slugify(name);
        if (NON_RESORT_PATTERNS.some((re) => re.test(id))) continue;

        const data = tab.getDataRange().getValues();
        const parsed = parseResortTab(name, data);
        if (!parsed) continue;
        // Final guard: a "real" resort brochure has at least one of the
        // canonical sections. Without any, it's almost certainly junk.
        const sections = locateSections(data);
        const hasAnySection = ["GATE", "CONTACTS", "COMMUNITY AMENITIES", "POOL", "TRASH", "PARKING"]
            .some((s) => sections[s] != null);
        if (!hasAnySection) continue;

        masterRows.push(parsed.row);
        for (const a of parsed.amenities) amenityRows.push(a);
    }

    writeTable(ss, OUTPUT_RESORTS_TAB, RESORT_COLUMNS, masterRows);
    writeTable(ss, OUTPUT_AMENITIES_TAB, AMENITY_COLUMNS, amenityRows);

    SpreadsheetApp.getUi().alert(
        `Done. ${masterRows.length} resorts, ${amenityRows.length} amenities written.`,
    );
}

function parseResortTab(tabName, rows) {
    // Locate the header row of each known section.
    const sections = locateSections(rows);

    const id = slugify(tabName);
    const isOut = OUT_RESORT_PREFIX_RE.test(tabName) || /^out-/.test(id);
    // Strip "OUT - " from the display name so the master tab is clean.
    const displayName = tabName.replace(OUT_RESORT_PREFIX_RE, "").trim() || tabName;
    const row = {
        id,
        name: displayName,
        type: isOut ? "out-resort" : "primary",
    };

    // GATE section: typically two rows below the header — first row is
    // "Gate Access" / "Login" labels, second row is the actual values.
    if (sections.GATE != null) {
        const headerRow = rows[sections.GATE + 1] || [];
        const valueRow = rows[sections.GATE + 2] || [];
        const loginIdx = findColIndex(headerRow, ["login"]);
        const accessIdx = findColIndex(headerRow, ["gate access", "access"]);
        if (loginIdx >= 0) {
            row.gate_login_url = stringify(valueRow[loginIdx]);
        }
        if (accessIdx >= 0) {
            row.gate_notes = stringify(valueRow[accessIdx]);
        }
        // Guess the gate system from the login URL.
        const url = String(row.gate_login_url || "").toLowerCase();
        if (url.includes("proptia.com")) row.gate_system = "proptia";
        else if (url.includes("gateaccess.net")) row.gate_system = "gateaccess";
        else if (url) row.gate_system = "other";
        else if (/attendant/i.test(row.gate_notes || "")) row.gate_system = "attendant";
    }

    // CONTACTS section: address / phone / website laid out columnar.
    if (sections.CONTACTS != null) {
        const headerRow = rows[sections.CONTACTS + 1] || [];
        const valueRow = rows[sections.CONTACTS + 2] || [];
        const addrIdx = findColIndex(headerRow, ["club house address", "clubhouse address", "address"]);
        const phoneIdx = findColIndex(headerRow, ["phone number", "phone"]);
        const webIdx = findColIndex(headerRow, ["website", "e-mail", "email"]);

        if (addrIdx >= 0) {
            const addrFull = stringify(valueRow[addrIdx]);
            row.clubhouse_address = addrFull;
            const cityStateZip = addrFull.match(/,\s*([A-Za-z .'-]+),\s*([A-Z]{2})\s*(\d{5})/);
            if (cityStateZip) {
                row.city = cityStateZip[1].trim();
                row.state = cityStateZip[2];
                row.zip = cityStateZip[3];
            }
        }
        if (phoneIdx >= 0) {
            row.clubhouse_phone = extractFirstPhone(valueRow[phoneIdx]);
        }
        if (webIdx >= 0) {
            const blob = stringify(valueRow[webIdx]);
            row.clubhouse_email = extractFirstEmail(blob);
        }

        // Scan every cell of the CONTACTS section (which usually only
        // has 2–4 rows of data) for GM / guardhouse / towing / HOA hints.
        // We split each cell into lines because Sheets cells often hold
        // multi-line blobs like "Orlando Franco\nGeneral Manager\n…".
        const contactsEnd = nextSectionAfter(sections.CONTACTS, sections, rows.length);
        for (let r = sections.CONTACTS + 1; r < contactsEnd; r++) {
            const line = rows[r] || [];
            for (let c = 0; c < line.length; c++) {
                const cell = stringify(line[c]);
                if (!cell) continue;
                scanContactsCell(cell, row);
            }
        }
    }

    // COMMUNITY AMENITIES: each row under the header = one amenity.
    const amenities = [];
    if (sections["COMMUNITY AMENITIES"] != null) {
        const startRow = sections["COMMUNITY AMENITIES"] + 1;
        const headerRow = rows[startRow] || [];
        const locIdx = findColIndex(headerRow, ["location"]);
        const hoursIdx = findColIndex(headerRow, ["hours"]);
        const codeIdx = findColIndex(headerRow, ["access / code", "access", "code"]);
        const courtIdx = findColIndex(headerRow, ["court"]);
        const feeIdx = findColIndex(headerRow, ["fee", "amenity fee", "amenitie fee"]);

        const amenEnd = nextSectionAfter(sections["COMMUNITY AMENITIES"], sections, rows.length);
        for (let r = startRow + 1; r < amenEnd; r++) {
            const line = rows[r] || [];
            const name = locIdx >= 0 ? stringify(line[locIdx]) : "";
            if (!name) continue;
            // Skip leftover header-like rows ("Location", "Hours" again).
            if (/^(location|hours|access)$/i.test(name)) continue;
            amenities.push({
                resort_id: id,
                amenity_name: name,
                hours: hoursIdx >= 0 ? stringify(line[hoursIdx]) : "",
                access_code: codeIdx >= 0 ? stringify(line[codeIdx]) : "",
                court: courtIdx >= 0 ? stringify(line[courtIdx]) : "",
                fee: feeIdx >= 0 ? stringify(line[feeIdx]) : "",
            });
        }

        // Amenity fee notes: often a long blob in the fee column above.
        if (feeIdx >= 0) {
            const blob = (amenities
                .map((a) => a.fee)
                .filter((s) => s && s.length > 10)
                .join(" | "))
                .trim();
            if (blob) row.amenity_fee_notes = blob;
        }
    }

    // POOL section: pool company + weekdays in the rows below.
    if (sections.POOL != null) {
        const valueRow = rows[sections.POOL + 2] || [];
        row.pool_company = stringify(valueRow[1]);
        row.pool_weekdays = stringify(valueRow[2]);
    }

    // TRASH section.
    if (sections.TRASH != null) {
        const valueRow = rows[sections.TRASH + 2] || [];
        row.trash_location = stringify(valueRow[1]);
        row.trash_days = stringify(valueRow[2]);
        row.trash_notes = stringify(valueRow[3]);
    }

    // PARKING section — collect everything up to the next known section.
    if (sections.PARKING != null) {
        row.parking_rules = collectBlobBounded(rows, sections.PARKING, sections);
    }

    // PACKAGES section.
    if (sections.PACKAGES != null) {
        row.packages_policy = collectBlobBounded(rows, sections.PACKAGES, sections);
    }

    // PETS section.
    if (sections.PETS != null) {
        const valueRow = rows[sections.PETS + 2] || [];
        const petsCell = stringify(valueRow[1]);
        row.pet_notes = petsCell;
        if (/^yes/i.test(petsCell)) row.pet_friendly = "yes";
        else if (/^no/i.test(petsCell)) row.pet_friendly = "no";
        else if (petsCell) row.pet_friendly = "conditional";
    }

    // ELETRIC CAR / EV section.
    const evIdx = sections["ELETRIC CAR"] != null ? sections["ELETRIC CAR"]
        : (sections["ELECTRIC CAR"] != null ? sections["ELECTRIC CAR"] : null);
    if (evIdx != null) {
        const valueRow = rows[evIdx + 3] || [];
        const evCell = stringify(valueRow[1]);
        if (/^yes/i.test(evCell)) row.ev_charger = "yes";
        else if (/^no/i.test(evCell)) row.ev_charger = "no";
    }

    return { row, amenities };
}

function locateSections(rows) {
    const known = new Set([
        "GATE", "CONTACTS", "COMMUNITY AMENITIES", "POOL", "TRASH",
        "PARKING", "PACKAGES", "PETS", "ELETRIC CAR", "ELECTRIC CAR",
    ]);
    const out = {};
    for (let r = 0; r < rows.length; r++) {
        const row = rows[r] || [];
        for (let c = 0; c < row.length; c++) {
            const cell = stringify(row[c]).trim().toUpperCase();
            if (known.has(cell) && out[cell] == null) {
                out[cell] = r;
            }
        }
    }
    return out;
}

function findColIndex(headerRow, candidates) {
    const lc = headerRow.map((c) => stringify(c).trim().toLowerCase());
    for (const cand of candidates) {
        const idx = lc.indexOf(cand.toLowerCase());
        if (idx >= 0) return idx;
    }
    return -1;
}

function stringify(v) {
    if (v == null) return "";
    if (typeof v === "string") return v.trim();
    return String(v).trim();
}

function slugify(name) {
    return String(name || "")
        .toLowerCase()
        .replace(/[áàâãä]/g, "a").replace(/[éèêë]/g, "e")
        .replace(/[íìîï]/g, "i").replace(/[óòôõö]/g, "o")
        .replace(/[úùûü]/g, "u").replace(/ç/g, "c")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

// Walk through a multi-line cell looking for labelled phones / emails /
// the General Manager block. Each detected piece is written to `row`
// only if that field hasn't been set yet.
function scanContactsCell(cell, row) {
    const lines = String(cell).split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const lower = line.toLowerCase();

        // Email — first email anywhere wins if no clubhouse_email yet.
        const email = extractFirstEmail(line);
        if (email) {
            if (!row.gm_email && /generalmanager|^gm@/i.test(email)) row.gm_email = email;
            if (!row.clubhouse_email && /frontdesk|info|reservations|reception/i.test(email)) {
                row.clubhouse_email = email;
            } else if (!row.clubhouse_email && !row.gm_email) {
                row.clubhouse_email = email;
            }
        }

        // "General Manager" line — GM name is usually the line above it.
        if (!row.gm_name && /general manager/i.test(line)) {
            for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
                const prev = lines[j].trim();
                if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/.test(prev)) {
                    row.gm_name = prev;
                    break;
                }
            }
        }

        // Phones with a contextual label win their slot.
        const phone = extractFirstPhone(line);
        if (phone) {
            if (!row.guardhouse_phone && /guard\s*house|gate\s*house|guardhouse/i.test(lower)) {
                row.guardhouse_phone = phone;
            } else if (!row.towing_phone && /tow/i.test(lower)) {
                row.towing_phone = phone;
            } else if (!row.hoa_phone && /\bhoa\b|customer\s*care/i.test(lower)) {
                row.hoa_phone = phone;
            } else if (!row.non_emergency_phone && /non.?emergency|sheriff|police/i.test(lower)) {
                row.non_emergency_phone = phone;
            } else if (!row.gm_phone && /general manager|gm[\s:]/i.test(lower)) {
                row.gm_phone = phone;
            }
        }
    }
}

function extractFirstPhone(s) {
    const m = stringify(s).match(/(\+?\d[\d\s().-]{7,})/);
    return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

function extractFirstEmail(s) {
    const m = stringify(s).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return m ? m[0] : "";
}

// Collect text inside a section. `headerRowIndex` is the row of the
// section's title; data starts on the next row. We stop at whichever
// other known section header comes next so adjacent sections don't
// bleed in.
function collectBlobBounded(rows, headerRowIndex, sections) {
    const nextSectionRow = nextSectionAfter(headerRowIndex, sections, rows.length);
    const parts = [];
    for (let r = headerRowIndex + 1; r < nextSectionRow; r++) {
        const line = rows[r] || [];
        for (let c = 1; c < line.length; c++) {
            const cell = stringify(line[c]);
            if (!cell) continue;
            // Drop the column-label row right under the section header
            // (things like "Cars Allowed?", "Parking Spot", "Days").
            if (r === headerRowIndex + 1 && cell.length < 40 && /\?$|^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/.test(cell)) {
                continue;
            }
            parts.push(cell);
        }
    }
    return parts.join(" | ").trim();
}

function nextSectionAfter(headerRowIndex, sections, totalRows) {
    let nearest = totalRows;
    for (const k of Object.keys(sections)) {
        const r = sections[k];
        if (r > headerRowIndex && r < nearest) nearest = r;
    }
    return nearest;
}

function writeTable(ss, tabName, columns, rows) {
    let tab = ss.getSheetByName(tabName);
    if (tab) ss.deleteSheet(tab);
    tab = ss.insertSheet(tabName, 0);
    const header = columns.slice();
    const data = rows.map((r) => columns.map((c) => r[c] != null ? r[c] : ""));
    tab.getRange(1, 1, 1, header.length).setValues([header])
        .setFontWeight("bold").setBackground("#222").setFontColor("#fff");
    if (data.length) {
        tab.getRange(2, 1, data.length, header.length).setValues(data);
    }
    tab.setFrozenRows(1);
    tab.autoResizeColumns(1, header.length);
}
