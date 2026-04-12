-- ============================================================
-- Seed: Champions Gate
-- Run this in: Supabase Studio > SQL Editor
-- Safe to re-run: it deletes any existing "Champions Gate" row first.
-- ============================================================

do $$
begin
    delete from public.resorts where name = 'Champions Gate';

    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by)
    values (
        'Champions Gate',
        array['champions gate', 'cg', 'oasis club', 'champions gate resort'],
        'Davenport, FL 33897',
        '1527#',
        $json$
[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            { "label": "Pedestrian Gate Code", "value": "1527#" },
            { "label": "Champions 1 (Gabriel) — Westside Gate", "value": "1550 Oasis Club Blvd — (407) 507-1570" },
            { "label": "Champions 1 (Gabriel) — US 27 Gate", "value": "46759 Palmetto Dunes — (863) 438-6702" },
            { "label": "Champions 2 (Rafael) — Leopard Creek Gate", "value": "9025 Leopard Creek Dr — (407) 507-1538" },
            { "label": "Champions 3 (Tatiani) — North Tract Gate", "value": "1150 Whistling Straits Blvd — (407) 507-5652" },
            { "label": "Gate Access System", "value": "https://gateaccess.net/login.aspx — QR codes only for drivers" },
            { "label": "Attendant Spreadsheet", "value": "https://docs.google.com/spreadsheets/d/15rnSnXSX9jOkxR0Gn9teNs3WUJYIHeWf_RzN1hzDBRg/" }
        ]
    },
    {
        "type": "custom",
        "title": "Orange Pass",
        "items": [
            { "label": "Where to get it", "value": "Main Gate only — staff available 24/7. Guest must be pre-registered in the gate access system." },
            { "label": "Used for", "value": "Gate entry AND access to community pools + fitness centers" },
            { "label": "Location 1", "value": "1150 Whistling Straits Blvd, Davenport, FL 33897" },
            { "label": "Location 2", "value": "Oasis Club Blvd, Davenport, FL — clubhouse (go through security gate first)" },
            { "label": "Location 3", "value": "46829 US-27, Davenport, FL 33897" }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            { "label": "Champions Gate Support", "value": "(407) 274-5593 — www.theoasisclubatchampionsgate.com" },
            { "label": "9035 Leopard Crk Dr, Davenport FL 33896", "value": "(407) 507-2800 — Jessica Roman (Jroman@theiconteam.com)" },
            { "label": "Whistling Straits Blvd, Kissimmee FL 34747", "value": "(407) 518-1222 Center Stage (Towing) — Scarlett Caamano (Scaamano@theiconteam.com)" },
            { "label": "RAMCO Patrol (4PM–4AM)", "value": "(407) 212-6816 — Isha Baglione (Ibaglione@theiconteam.com)" }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            { "label": "Oasis Club — 1520 Oasis Club Blvd", "value": "9AM–9PM — QR Code" },
            { "label": "Retreat Club — 9035 Leopard Creek Dr (Wed–Sun)", "value": "10AM–9PM — QR Code" },
            { "label": "Game Room", "value": "9AM–9PM — QR Code" },
            { "label": "Grill Room Bar", "value": "9AM–9PM — QR Code" },
            { "label": "Movie Theater", "value": "9AM–9PM — QR Code" },
            { "label": "The Palms Room", "value": "9AM–9PM — QR Code" },
            { "label": "Fitness Center", "value": "9AM–9PM — QR Code" },
            { "label": "Children Splash Zone", "value": "9AM–9PM — QR Code" },
            { "label": "Quiet Pool", "value": "9AM–9PM — QR Code" },
            { "label": "Jacuzzi Tub", "value": "9AM–9PM — QR Code" },
            { "label": "Lazy River (1023 ft) + Waterslide", "value": "9AM–9PM — QR Code" },
            { "label": "Pickleball (4 courts)", "value": "Bathrooms code: 1999" },
            { "label": "Courts Available", "value": "Tennis, Volleyball, Pickleball" }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            { "label": "Pool Company", "value": "Blue Dive" }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            { "label": "Bench Pickup", "value": "Daily, no holidays" }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            { "label": "Cars Allowed", "value": "Yes — up to 6 cars per household" },
            { "label": "Street Parking", "value": "Allowed. Additional spots on Stinger Dr, Hazard St, and at the Oasis Club." },
            { "label": "Overnight", "value": "No vehicles overnight — cars towed starting 10PM. The clubhouse does NOT accept overnight parking." },
            { "label": "Restrictions", "value": "No commercial vehicles. No RVs or trailers." }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            { "label": "Delivery", "value": "Straight home — no charge. USPS does NOT deliver." }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            { "label": "Policy", "value": "Service animals only" }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            { "label": "EV Charger", "value": "Not available" }
        ]
    }
]
$json$::jsonb,
        'seed'
    );
end $$;
