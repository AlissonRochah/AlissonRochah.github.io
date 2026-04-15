-- ============================================================
-- Seed: All resorts (generated from Resort Info.xlsx)
-- Run this in: Supabase Studio > SQL Editor
-- Safe to re-run: each resort is delete-then-insert by name.
-- ============================================================

do $$
begin
    delete from public.resorts where name = '501 First Residences - MIAMI';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        '501 First Residences - MIAMI',
        array['501 first residences - miami', 'frm']::text[],
        null,
        '118311',
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "https://app.getlynx.co/properties",
                "value": "IMPORTANT INFO: Login: info@mastervacationhomes.com"
            },
            {
                "label": "",
                "value": "Password: MasterMiami1618!"
            },
            {
                "label": "",
                "value": "The Confirmation letter must be edited manually"
            },
            {
                "label": "",
                "value": "Could you please write here in the Airbnb chat the name of everyone in your party and your email address? I want to make sure you are registered for your stay. | There will be no keys. You will have your own door code."
            },
            {
                "label": "",
                "value": "DOOR CODE"
            },
            {
                "label": "Door code",
                "value": "IMPORTANT INFO"
            },
            {
                "label": "Door code 118311 (BackUp (Lissandra`s door code)",
                "value": "The Confirmation letter must be edited manually and the door code must be created before | confirmation letter be sent"
            },
            {
                "label": "",
                "value": "Door code must be created before confirmation letter be sent"
            },
            {
                "label": "",
                "value": "https://app.getlynx.co/properties"
            },
            {
                "label": "",
                "value": "Login: info@mastervacationhomes.com"
            },
            {
                "label": "",
                "value": "Password: MasterMiami1618!"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "",
                "value": "121 NE 5th St - unit 3108 - Miami, Florida 33132"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "121 NE 5th Street - Miami, FL 33132",
                "value": "There is a Key Fob nest to the thermostat"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "",
                "value": "All trash must be securely wrapped in plastic garbage bags and sent down the trash chute. | Cardboards and boxes of any size may not be thrown down the trash chutes."
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Third-party valet company",
                "value": "Parking Spot: $50 a day. Price subject to change without notice. | Valet parking services provided by a third-party valet company at 501 First Residences. | Parking building on the same street using Pay by phone app."
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "There is no mail access for online purchases."
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Azur';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Azur',
        array['azur']::text[],
        null,
        '0426#',
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "Code 0426#"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "",
                "value": "No Club house"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "No Club house - Only an comunity pool",
                "value": "24h — No code"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "TRASH BIN IN FRONT OF THE HOUSE",
                "value": "Days: DAILY"
            },
            {
                "label": "",
                "value": "All the must be bagged in trash bags. Trash will not be taken if trash is not bagged, or if trash is in a grocery store bag. No Publix, Target, Walmart, CVS, Walgreens, or other small bags allowed."
            },
            {
                "label": "",
                "value": "Please, no not leave trash outside overnight. Trash outside overnights attracts wild animals and rodents to the property."
            },
            {
                "label": "",
                "value": "No not place loose trash in the trash valet bins or outside the trash valet bin."
            },
            {
                "label": "",
                "value": "Do not place broken glass, needles, or any type of liquid in your trash."
            },
            {
                "label": "",
                "value": "If you have boxes, you must break them down and leave them next to the trash valet bin."
            },
            {
                "label": "",
                "value": "Please, put your trash out in the morning no later than 9am. Trash is picked up once daily by 11am."
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "",
                "value": "Yes, one carport + two spots with parking permit in the vehicle."
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "STRAIGHT TO THE HOUSE"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Bella Piazza';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Bella Piazza',
        array['bella piazza', 'bp']::text[],
        '908 Charo Parkway, Davenport, Florida 33897',
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "Open gate"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "908 Charo Parkway, Davenport, Florida 33897",
                "value": "Phone number: (863) 420-7970 — Website / E-mail: https://bellapiazza.connectresident.com/"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "- Clubhouse | - Game Room | - Fitness Center | - Two Resort Pools | - BBQ Grilling Area | - Children's Splash Pool",
                "value": "Sunrise to sunset — The guest has access using a key card that will be at home"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "",
                "value": "Place trash in the plastic bench daily to keep a clean home."
            },
            {
                "label": "",
                "value": "Guest also can take the trash to the dumpsters."
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "",
                "value": "Parking is free."
            },
            {
                "label": "",
                "value": "Parking operates on a first‑come, first‑served basis. | |"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "If the online seller uses USPS, it will not get delivered as the Post Office does not recognize vacation homes as regular addresses and the package will be returned back to the sender. | Only UPS, DHL and FEDEX delivers them. | In some resorts the packages are delivered to the clubhouse. Fees may apply. | Some resorts may not accept them. | Keep in mind we are not responsible for unexpected issues with your online purchases. If you have any questions, please contact us."
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "There is no electric vehicle charger available."
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Bella Vida';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Bella Vida',
        array['bella vida', 'bv']::text[],
        '1172 Marcello Blvd - Kissimmee, FL 34746',
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "Attendant",
                "value": "Login: QR CODE"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "1172 Marcello Blvd - Kissimmee, FL 34746",
                "value": "Phone number: 321-677-0444 HOA — Website / E-mail: bellavida@accessdifference.com"
            },
            {
                "label": "It is opened from 9AM to 6PM everyday except holidays",
                "value": "Phone number: Toll Free: 1-888-821-4044 — Website / E-mail: two"
            },
            {
                "label": "Towint",
                "value": "Towing company: 321-442-3772"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Swimming Pool",
                "value": "Hours: 08AM - 7PM — Access / Code: Guest doesn't need key card — Court: Basketball"
            },
            {
                "label": "Playground",
                "value": "Hours: 09AM - 10PM — Access / Code: Guest doesn't need key card — Court: VolleyBall"
            },
            {
                "label": "Fitness Center",
                "value": "09AM - 10PM — Guest doesn't need key card"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Garcia Pools - Rodrigo",
                "value": "Weekday: Wednesday"
            },
            {
                "label": "",
                "value": "361 - Toninho ((407)716 5988)"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Trash bin in front of the house",
                "value": "Days: Everyday"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Driveway Only",
                "value": "Parking Spot: No Parking On Street"
            },
            {
                "label": "No commercial, recreational or traillers",
                "value": "Parking Spot: Parking lot in the club house"
            },
            {
                "label": "New Generation Towing",
                "value": "Parking Spot: Overnight parking accepted"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Packages are delivered straight to the house."
            },
            {
                "label": "",
                "value": "Clubhouse No/ USPS No /Only Amazon"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Calabria';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Calabria',
        array['calabria']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "No Gate",
                "value": "Login: It is an open community"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "No Clubhouse",
                "value": "No HOA"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "",
                "value": "No amenities"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Supreme - Breno",
                "value": "Weekday: Wednesday???"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Trash bin beside the house",
                "value": "Days: Wednesdays"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Garage",
                "value": "Parking Spot: Driveway"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Straight to the house"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No rules about it"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Champions Gate';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Champions Gate',
        array['cg', 'champions gate']::text[],
        '9035 Leopard Crk Dr, Davenport, FL 33896',
        '1527#',
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "(Attendant/Gate System)",
                "value": "https://gateaccess.net/login.aspx — QR CODES only for the drivers"
            },
            {
                "label": "PEDESTRIAN GATE: 1527#",
                "value": "Login: https://docs.google.com/spreadsheets/d/15rnSnXSX9jOkxR0Gn9teNs3WUJYIHeWf_RzN1hzDBRg/edit?gid=701856462#gid=701856462"
            },
            {
                "label": "",
                "value": "Champions 1 (GABRIEL):Westside Gate - 1550 Oasis Club Blvd (407) 507-1570"
            },
            {
                "label": "",
                "value": "Champions 1 (GABRIEL):US 27 Gate - 46759 Pamleto Dunes (863) 438-6702"
            },
            {
                "label": "",
                "value": "Champions 2 (RAFAEL): Leopard Creek Gate - 9025 Leopard Creek Dr (407) 507-1538"
            },
            {
                "label": "",
                "value": "Champions 3 (TATIANI): North Tract Gate - 1150 Whistling Straits Blvd (407) 507-5652"
            },
            {
                "label": "",
                "value": "The Orange Pass can only be issued at the Main Gate, where staff is available 24/7. In order for it to be generated, the guest must be previously registered in the gate access system. | There are 3 locations where the Orange Pass can be issued. This pass is used for both gate entry and access to the community pools and fitness centers: | 1150 Whistling Straits Blvd, Davenport, FL 33897 | Oasis Club Blvd, Davenport, FL | (this is the clubhouse, and you will need to go through a security gate first) | 46829 US-27, Davenport, FL 33897 |"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "Champions Gate support: (407) 274 5593",
                "value": "www.theoasisclubatchampionsgate.com"
            },
            {
                "label": "9035 Leopard Crk Dr, Davenport, FL 33896",
                "value": "Phone number: (407) 507-2800 — Website / E-mail: Jessica Roman – Jroman@theiconteam.com"
            },
            {
                "label": "Whistling Straits Blvd, Kissimmee, FL 34747",
                "value": "Phone number: (407) 518-1222 (Center Stage) Towing contact — Website / E-mail: Scarlett Caamano – Scaamano@theiconteam.com"
            },
            {
                "label": "(407) 212-6816 RAMCO - PATROL 4PM-4AM",
                "value": "Isha Baglione – Ibaglione@theiconteam.com"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "OASIS CLUB - 1520 Oasis club Blvd.",
                "value": "Hours: 09AM - 09PM — Access / Code: QR Code — Court: Tennis"
            },
            {
                "label": "RETREAT CLUB - 9035 Leopard Creek Dr (Wed-Sun)",
                "value": "Hours: 10AM - 09PM — Access / Code: QR Code — Court: Volleyball"
            },
            {
                "label": "Game Room",
                "value": "Hours: 09AM - 09PM — Access / Code: QR Code — Court: Pickleball"
            },
            {
                "label": "Grill Room Bar",
                "value": "09AM - 09PM — QR Code"
            },
            {
                "label": "Movie Theater",
                "value": "09AM - 09PM — QR Code"
            },
            {
                "label": "The Palms Room",
                "value": "09AM - 09PM — QR Code"
            },
            {
                "label": "Fitness Center",
                "value": "09AM - 09PM — QR Code"
            },
            {
                "label": "Children Splash Zone",
                "value": "09AM - 09PM — QR Code"
            },
            {
                "label": "Quiet Pool",
                "value": "09AM - 09PM — QR Code"
            },
            {
                "label": "Jacuzzi tub",
                "value": "09AM - 09PM — QR Code"
            },
            {
                "label": "1023 FT Lazy River w/ waterslide",
                "value": "09AM - 09PM — QR Code"
            },
            {
                "label": "PickleBall court (they have 4 courts)",
                "value": "09AM - 09PM — Bathrooms code: 1999"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Blue Dive",
                "value": "Weekday: ????"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Bench",
                "value": "Days: Daily, no holidays"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: Street parking is allowed. You will have additional spots on Stinger Dr, Hazard St and at the Oasis Club."
            },
            {
                "label": "6 cars per household",
                "value": "Parking Spot: No vehicles overnight, cars will be towed starting at 10PM"
            },
            {
                "label": "No commercial vehicles",
                "value": "Parking Spot: * The clubhouse does not accept overnight parking"
            },
            {
                "label": "",
                "value": "No recreational vehicles or trailers allowed"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "No charge. Straight home. USPS DOES NOT DELIVER"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "Only Service animal"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Cumbrian Lakes';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Cumbrian Lakes',
        array['cl', 'cumbrian lakes']::text[],
        '4594 Cumbrian Lakes Dr, Kissimmee, FL 34747',
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "*1753"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "4594 Cumbrian Lakes Dr, Kissimmee, FL 34747",
                "value": "407-846-0915"
            },
            {
                "label": "HOA PHONE NUMBER",
                "value": "407-846-6323"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "",
                "value": "None"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Garcia Pools - Rodrigo",
                "value": "Weekday: Monday"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Trash Bin",
                "value": "Days: Blue on Thursday morning"
            },
            {
                "label": "",
                "value": "Brown on Monday morning"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: Driveway or in the garage"
            },
            {
                "label": "No commercial vehicles, recreational vehicles or traillers are allowed",
                "value": "Parking Spot: No overflow parking"
            },
            {
                "label": "Road Biz – 407-343-5555 (TOWING INFORMATION)",
                "value": "Parking Spot: Street parking is not permitted"
            },
            {
                "label": "",
                "value": "No block the sidewalk"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Compass Bay';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Compass Bay',
        array['cb', 'compass bay']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "#3400 / #0664"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "2100 S. Hiawassee Road - Orlando, FL 32835",
                "value": "877-221-6919"
            },
            {
                "label": "Office main number",
                "value": "407-425-4561"
            },
            {
                "label": "Community Association Manager Direct Line",
                "value": "407-241-1095"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Playground",
                "value": "09AM - 05PM — No code"
            },
            {
                "label": "",
                "value": "BBQ Area"
            },
            {
                "label": "",
                "value": "Community Pool"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "",
                "value": "No pool"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "",
                "value": "Dumpster on Tocoa St"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: In the garage or Driveway, not block the sidewalk"
            },
            {
                "label": "No commercial, recreational or traillers",
                "value": "Parking Spot: No overflow parking"
            },
            {
                "label": "",
                "value": "No overnight parking at the club house"
            },
            {
                "label": "",
                "value": "No Street parking"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Packages are delivered straight to the house."
            },
            {
                "label": "",
                "value": "Clubhouse No/ USPS No"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Crescents Lakes';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Crescents Lakes',
        array['cl', 'crescents lakes']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "No Gate",
                "value": "Login: It is an open community"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "",
                "value": "Crescent Lakes | Crescent Lakes Way, Florida 34758"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "",
                "value": "No amenities"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Garcia Pools - Rodrigo",
                "value": "Weekday: Monday"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "",
                "value": "Tuesday and Thursday"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Crystal Cove';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Crystal Cove',
        array['cc', 'crystal cove']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "#5254"
            },
            {
                "label": "",
                "value": "HOA 407-847-2280 |"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "",
                "value": "407-705-7883"
            },
            {
                "label": "Center State Towing",
                "value": "407-518-1222"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Club House",
                "value": "Key Card"
            },
            {
                "label": "Pool Area",
                "value": "6AM - 8PM — Key Card"
            },
            {
                "label": "",
                "value": "Playground"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Garcia Pools - Rodrigo",
                "value": "Weekday: Monday"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Side of the house",
                "value": "Days: Tuesday"
            },
            {
                "label": "",
                "value": "Collected 1x week"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Cars can only be parked in your driveway, not in the street, not blocking the sidewalk or | they will be towed. |",
                "value": "Parking Spot: No parking on Street"
            },
            {
                "label": "No recreational vehicles",
                "value": "Parking Spot: No block the sidewalk"
            },
            {
                "label": "Commercial Vehicles: Yes, up to 26,000 lbs. but must follow same parking rules.",
                "value": "Parking Spot: No overnight parking"
            },
            {
                "label": "Vans: As long as it fits in driveway and doesn’t block the sidewalk and is under 26,000 lbs",
                "value": "Parking Spot: No overflor parking"
            },
            {
                "label": "",
                "value": "Centerstate towing 407-518-1222"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Directly to the House / NO USPS"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Emerald';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Emerald',
        array['emerald']::text[],
        '2751 Emerald Island Blvd, Kissimmee, FL 34747',
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "Attendant"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "2751 Emerald Island Blvd, Kissimmee, FL 34747",
                "value": "Phone number: 407-787-3965 — Website / E-mail: info@cramember.com"
            },
            {
                "label": "",
                "value": "760-663-4941"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Pool and Spa Area",
                "value": "Hours: 8AM to 10PM — Access / Code: 861.0 — Court: Volleyball"
            },
            {
                "label": "Fitness Center",
                "value": "8AM to 10PM"
            },
            {
                "label": "Tiki Bar",
                "value": "11AM - 10PM"
            },
            {
                "label": "",
                "value": "Playground"
            },
            {
                "label": "",
                "value": "For use the clubhouse guests must pay $20 for the passcard which will be refunded once they return by the end of they reservation"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "",
                "value": "Supreme Pools - Breno"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "",
                "value": "TH - Underground bin. It is located near the driveway."
            },
            {
                "label": "Single Family - Trash Bin - just accept 13 gallons",
                "value": "Days: Every day"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: Free Parking"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Packages are delivered straight to the house."
            },
            {
                "label": "",
                "value": "Clubhouse No/ USPS No"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "Yes"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Encantada';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Encantada',
        array['encantada']::text[],
        '3070 Secret Lake Dr, Kissimmee, FL 34747',
        '0126',
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "Gate Community - It changes every 2 months",
                "value": "Login: Resident Entry Code: #0126 / After April 15th: #0339. Vendors entry Code: #3070 and Pedestrian Gate Code: 0120"
            },
            {
                "label": "",
                "value": "*From Appril 15th - Vendors Entry Code: #4226"
            },
            {
                "label": "",
                "value": "*From Appril 15th - Pedestrian Gate: 0339(Note there is no # for Pedestrian Gate)"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "3070 Secret Lake Dr, Kissimmee, FL 34747",
                "value": "(407) 997-9478"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Club House",
                "value": "Mon - Fri 9am - 6pm"
            },
            {
                "label": "Pool Area",
                "value": "Sunrise / Sunset"
            },
            {
                "label": "",
                "value": "Restaurant - The Cabana Pool Bar & Grill"
            },
            {
                "label": "Fitness Center",
                "value": "8AM - 11PM"
            },
            {
                "label": "Game Room",
                "value": "8AM - 11PM"
            },
            {
                "label": "Front Desk",
                "value": "24 hours"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Garcia Pools - Rodrigo",
                "value": "Weekday: Monday"
            },
            {
                "label": "",
                "value": "Spa - William"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "",
                "value": "Guest takes to dumpster"
            },
            {
                "label": "",
                "value": "Location: Back to the property on White Orchid Rd"
            },
            {
                "label": "",
                "value": "Location: Back to the property on Secret Lake Rd"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: Parking Spot on the street"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Packages are delivered directly to the club house."
            },
            {
                "label": "",
                "value": "There is a handling fee of $20 per package."
            },
            {
                "label": "",
                "value": "Please ensure that every package is correctly labelled with the name of the guest on the reservation forms."
            },
            {
                "label": "",
                "value": "Mail and packages may only be picked up between 7pm and 7am due to current time constraints on staff."
            },
            {
                "label": "",
                "value": "Any packages not retrieved within 14 days will be returned to sender"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "Yes"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Encore';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Encore',
        array['encore']::text[],
        '101 Lasso Dr, Reunion, FL, 34747',
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "Attendant",
                "value": "https://www.myenvera.com/#/visitors — (antigo, nao precisa mais)"
            },
            {
                "label": "Confirmation Letter will be requested at the gate",
                "value": "Login: https://docs.google.com/spreadsheets/d/15rnSnXSX9jOkxR0Gn9teNs3WUJYIHeWf_RzN1hzDBRg/edit?gid=701856462#gid=701856462"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "101 Lasso Dr, Reunion, FL, 34747",
                "value": "407-476-0414"
            },
            {
                "label": "",
                "value": "407-635-8105"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Club House",
                "value": "Hours: 11AM - 06PM — Access / Code: Not allowed guests get in — Court: Basketball"
            },
            {
                "label": "Playground",
                "value": "Hours: 11AM - 06PM — Access / Code: Not allowed guests get in — Court: Volleyball"
            },
            {
                "label": "Fitness Center",
                "value": "11AM - 06PM — Important Update: Guest have access permission"
            },
            {
                "label": "Restaurant",
                "value": "11AM - 06PM — Not allowed guests get in"
            },
            {
                "label": "Spa",
                "value": "11AM - 06PM — Important Update: Guest have access permission"
            },
            {
                "label": "Pool",
                "value": "11AM - 06PM — Not allowed guests get in"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "",
                "value": "Blue Dive - Regina"
            },
            {
                "label": "7634 Wilmington",
                "value": "Weekday: HOA"
            },
            {
                "label": "7434 Marker",
                "value": "Weekday: HOA"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Trash Bin beside the house",
                "value": "Days: Daily"
            },
            {
                "label": "",
                "value": "Dumpster in Reunion TH - Heritage Crossing Ct ends"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes, Pay attention for the streets signs",
                "value": "Parking Spot: Only in marked spots"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Deliver at home"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "Yes, Dogs 30 LBs or less"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Festival';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Festival',
        array['festival']::text[],
        '1503 Champions Gate Blvd W, Davenport, FL 33896',
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "*3190"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "1503 Champions Gate Blvd W, Davenport, FL 33896",
                "value": "(863)866-0292"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Club House",
                "value": "Hours: 10AM - 04:30PM — Access / Code: Needs Key Fob — Court: Volleyball"
            },
            {
                "label": "Game Room",
                "value": "10AM - 04:30PM — Needs Key Fob"
            },
            {
                "label": "Fitness Center",
                "value": "06:30AM - 10PM — Needs Key Fob"
            },
            {
                "label": "Pool Area",
                "value": "Dawn to dusk — Needs Key Fob"
            },
            {
                "label": "Kids Splash Park",
                "value": "Dawn to dusk"
            },
            {
                "label": "Mini Golf course",
                "value": "Dawn to dusk"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Paradise Pools - William",
                "value": "Weekday: Monday"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Bench in front of the house (up to 2 Bags)",
                "value": "Days: 7 days a week / 2 bags"
            },
            {
                "label": "Extra bags must be taken to the compactor on site at the Amenity Center",
                "value": "Days: 4PM - 6PM"
            },
            {
                "label": "",
                "value": "Contact the HOA Office for access to the trash compactor"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "No needed parking pass",
                "value": "Parking Spot: Trailers / Big vans - not allowed"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Deliver at home"
            },
            {
                "label": "",
                "value": "No Mailboxes"
            },
            {
                "label": "",
                "value": "HOA does not accept packages"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No pets inside amenities"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Fiesta Key';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Fiesta Key',
        array['fiesta key', 'fk']::text[],
        '1101 S Beach Cir, Kissimmee, FL 34746',
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "#5050"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "1101 S Beach Cir, Kissimmee, FL 34746",
                "value": "HOA 407-847-2280"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Club house",
                "value": "08AM - DUSK — Key fob"
            },
            {
                "label": "Playground",
                "value": "08AM - DUSK — Key fob"
            },
            {
                "label": "Pool",
                "value": "Hours: 08AM - DUSK — Access / Code: Key fob — Court: Tennis"
            },
            {
                "label": "Fitness Center",
                "value": "08AM - DUSK — Key fob"
            },
            {
                "label": "",
                "value": "Owner must supply renter with access card"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "",
                "value": "No pool"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "",
                "value": "Dumpster by the entrance"
            },
            {
                "label": "",
                "value": "right side"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "There is no limit however, the driveway will only hold 2 vehicles. |",
                "value": "Parking Spot: Driveway only"
            },
            {
                "label": "Overnight: Only 1 vehicle for one night upon 3 days in advance request.",
                "value": "Parking Spot: No overflow parking"
            },
            {
                "label": "Commerciall vehicles and Vans are accepted: It must be under 26k pounds and must fit in driveway without being over sidewalk.",
                "value": "Parking Spot: No Street parking"
            },
            {
                "label": "",
                "value": "No recreational vehicles"
            },
            {
                "label": "",
                "value": "Towing information/ Phone number: Centerstate towing 407-518-1222"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "The guests can not receive packages on the property."
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Formosa Valley';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Formosa Valley',
        array['formosa valley', 'fv']::text[],
        null,
        '2317#',
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "2317#"
            },
            {
                "label": "",
                "value": "Pedestrian C 1268Y"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "",
                "value": "The pool cabana code: c2347A"
            },
            {
                "label": "",
                "value": "There are only table and chairs"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Sunshine Pools - Renato",
                "value": "Weekday: Wednesday"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Dumpster",
                "value": "Days: Daily"
            },
            {
                "label": "",
                "value": "The end of the street"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: Parking Spot on the street"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Straight to the house"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Hampton Lakes';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Hampton Lakes',
        array['hampton lakes', 'hl']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "No Gate - Residential Area"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "",
                "value": "No club house"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "No club house",
                "value": "8AM - 08PM — Tennis"
            },
            {
                "label": "",
                "value": "Basketball"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Sunshine Pools - Renato",
                "value": "Weekday: Monday"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Trash",
                "value": "Days: Mondays"
            },
            {
                "label": "Recycling",
                "value": "Days: Fridays"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "2 in the driveway",
                "value": "Parking Spot: No overflow parking"
            },
            {
                "label": "Not allowed:",
                "value": "Parking Spot: In front of the garage"
            },
            {
                "label": "",
                "value": "Commercial vehicls, trailers,"
            },
            {
                "label": "",
                "value": "boats, mobile homes,"
            },
            {
                "label": "",
                "value": "golf carts or other recreational and inoperable vehicles."
            },
            {
                "label": "",
                "value": "The DCCRs define commercial vehicles as \"as any vehicle with | commercial writing on their exterior or vehicles primarily used, designed or registered for a | commercial purpose and vehicles with advertising signage attached or displayed on such | vehicles exterior\"."
            },
            {
                "label": "",
                "value": "Parking enforcement began on August 1, 2023, from midnight to 6:00 am every night. A towing | company is contracted to place a sticker on any vehicle parked on the street. This sticker is | notification that the vehicle cannot be parked on the street and can be towed. Those vehicles are | subject to towing the next night if found parked on the street again. |"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Regular"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Lake Berkley';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Lake Berkley',
        array['lake berkley', 'lb']::text[],
        '901 Park Terrace Circle',
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "NO GATE",
                "value": "Login: https://srkresidentialcommunities.com/guest-registration-form/"
            },
            {
                "label": "",
                "value": "lakeberkley.uas@gmail.com"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "901 Park Terrace Circle",
                "value": "(407) 390-1910"
            },
            {
                "label": "",
                "value": "1010 Park Ridge Cir, Kissimmee, FL 34746, EUA"
            },
            {
                "label": "",
                "value": "There is nobody in the clubhouse. Security is the staff present at Lake Berkley Resort. Our | number is 4073901910. Our email is lakeberkley.uas@gmail.com We are gate access | control security only. |"
            },
            {
                "label": "",
                "value": "Guest Access: Amenities include clubhouse, pool, gym, basketball court, tennis court, gazebo, fishing | pier (catch and release only) playground, volleyball court, miles of sidewalk to hike and | walk on, 24/7 gate security"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Fitness Center",
                "value": "10AM - 09PM — Tennis"
            },
            {
                "label": "Swimming pool",
                "value": "Basketball"
            },
            {
                "label": "",
                "value": "Fishing deck"
            },
            {
                "label": "",
                "value": "The main clubhouse and Community Pool up by the Security Gate to the left once you enter the community is considered Masters Property so anybody can use them."
            },
            {
                "label": "",
                "value": "The pool hours are 8am to dusk dark daily as per State Health Department Regulations. The Gym and Clubhouse hours are 7am-10pm daily. Guests must see Security for code to Gym as it is for 16 year olds and up."
            },
            {
                "label": "",
                "value": "The pool and clubhouse is monitored on camera by Security 24/7 so no parties, gatherings, or kids showing off or being destructive of Private Property will be tolerated."
            },
            {
                "label": "",
                "value": "All rules and hours must be followed that are posted in these areas or future access will be denied."
            },
            {
                "label": "",
                "value": "Anybody caught in pool area after dark or afterhours will be confronted by the sheriff's department as we do not tolerate it."
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Garcia Pools - Rodrigo",
                "value": "Weekday: Wednesday"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Trash Cart",
                "value": "Days: Recycle Pickup Day: WED"
            },
            {
                "label": "",
                "value": "Trash Pickup Day: THU"
            },
            {
                "label": "Townhouse ->",
                "value": "Days: Dumpster at clubhouse | at the end of Park Terrace Cir."
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Manor’s allows 4 cars max. Up to two cars must park in the driveway first. They must be | parked side by side, pulled up to the garage door. |",
                "value": "Parking Spot: Driveway only"
            },
            {
                "label": "Street Parking: The sidewalk to the street behind must remain clear. Up to two additional vehicles may | park on the correct side of the street. It is the guests and owners responsibility to look for | the signs on which side of the street you can not park on",
                "value": "Parking Spot: No overnight at the club house"
            },
            {
                "label": "",
                "value": "Commercial and recreational Vehicles: Boats, RVs, Campers, Any type of Trailers, Tractor Trailer Semis, Busses, Shuttle | Busses, Uhauls or box trucks, Commercial Vehicles or work vehicles with large tool | boxes or ladders racks, any type of vehicle that has non removable logos are not | permitted on property. Logos must be removed while on property. Regular passenger | vans are permitted but not cargo vans. All vehicles above must park in the overflow lot. | This lot is first come first serve and the pathway leading to, and the chain link fence gate | in the back of the lot must all remain clear per the county officials. All vehicles must be | registered on the overflow lot log. |"
            },
            {
                "label": "",
                "value": "Magic Towing: 4078475333"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "straight to the property/ USPS NO"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No, Resort will ask for the support animal or service animal proof"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Le Reve';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Le Reve',
        array['le reve', 'lr']::text[],
        null,
        '2323',
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "Gate code",
                "value": "Login: 2323.0"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Club house w/ pool",
                "value": "9M - 5PM — 3456#"
            },
            {
                "label": "Fitness Center",
                "value": "9M - 5PM — 3456#"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "From resort - Andrea Pools",
                "value": "Weekday: 2x per week"
            },
            {
                "label": "407 - 371 - 8389",
                "value": "Weekday: Call for extra day"
            },
            {
                "label": "Pool code",
                "value": "Weekday: 3456.0"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Trash bin",
                "value": "Days: After 9AM - Tuesday"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes, 2 vehicles per home",
                "value": "Parking Spot: One garage"
            },
            {
                "label": "No Vans",
                "value": "Parking Spot: One driveway"
            },
            {
                "label": "No commercial, no recreational, no traillers",
                "value": "Parking Spot: No overnight parking, no street parking"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Indian Creek';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Indian Creek',
        array['ic', 'indian creek']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "No Gate (Open community)"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Paradise Pools - William",
                "value": "Weekday: Monday"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Trash bin",
                "value": "Days: Wed Recycle/ Thur Trash"
            },
            {
                "label": "",
                "value": "Next to the house."
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: Driveway"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Regular"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "Yes"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Liberty Village';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Liberty Village',
        array['liberty village', 'lv']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "Open Community"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Garcia Pools - Rodrigo",
                "value": "Weekday: Tuesday???"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Brown Trash bin - TRASH",
                "value": "Days: Monday"
            },
            {
                "label": "Blue Trash bin - RECY",
                "value": "Days: Thursday"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "2 Cars",
                "value": "Parking Spot: Driveway / Not block the sidewalk"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Straight to the house"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Lucaya Village';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Lucaya Village',
        array['lucaya village', 'lv']::text[],
        '3040 Polynesian Isle Blvd, Kissimmee, FL 34746',
        '2293',
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "Gate Code for October: 2293"
            },
            {
                "label": "Codes 4974, 2293, 5484, 7629, 4485",
                "value": "Login: 5484.0"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "3040 Polynesian Isle Blvd, Kissimmee, FL 34746",
                "value": "321-203-3570"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Pool (Heated)",
                "value": "8AM-9PM"
            },
            {
                "label": "Fitness center",
                "value": "07:00AM - 10PM"
            },
            {
                "label": "Game room",
                "value": "07:30AM - 10PM"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "",
                "value": "No pool"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "",
                "value": "Dumpster on Every corner,"
            },
            {
                "label": "",
                "value": "Dumpster on Yellowgold,"
            },
            {
                "label": "",
                "value": "Diplomat court (phase 2) Lucayan Harbour circle"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: Parking Spot on the street"
            },
            {
                "label": "",
                "value": "Trailer or RVs are not allowed"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Regarding deliveries at Lucaya Village Resort: the clubhouse holds packages for up to 10 days. If you’re expecting any deliveries, you can pick them up directly at the clubhouse during their operating hour. |"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "Yes"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Lindsfields';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Lindsfields',
        array['lindsfields']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "No Gate - Open Community"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Supreme - Breno",
                "value": "Weekday: Wednesday???"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Trash OUT",
                "value": "Days: Wednesday"
            },
            {
                "label": "Trash PICK UP",
                "value": "Days: Thursday"
            },
            {
                "label": "Recycle OUT",
                "value": "Days: Tuesday"
            },
            {
                "label": "Recycle PICK UP",
                "value": "Days: Wednesday"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: Street Parking"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Straight to the house"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Magic Village Views';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Magic Village Views',
        array['magic village views', 'mvv']::text[],
        null,
        '2329',
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "MAGIC VILLAGE VIEWS - GATE CODE: 2329 / 7774 |",
                "value": "Login: MAGIC VILLAGE VIEWS - GATE CODE: 1147 (Sep)"
            },
            {
                "label": "Pedestrian Code: 5134",
                "value": "Login: Magic village Views Pedestrian Code: 5134"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "7430 Brooklyn Drive, Kissimmee, FL 34747 (VIEWS)",
                "value": "Phone number: (407) 219-9174 - HOA — Wi-Fi Support: Send a text message to:"
            },
            {
                "label": "(321) 512-0397 - Magic Village General",
                "value": "David Allen (from Comsat): (407) 346-5502"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Club House (Heated Pool and Hot tub)",
                "value": "08AM - 05PM — $100 per day — Volley"
            },
            {
                "label": "Fitness Center",
                "value": "Hours: JohnsonJohnson — Court: Tennis"
            },
            {
                "label": "",
                "value": "Kids Playroom"
            },
            {
                "label": "",
                "value": "Restaurant"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Spa",
        "items": [
            {
                "label": "Paradise Pools - William",
                "value": "Weekday: Monday???"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "",
                "value": "Trash bin"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: 2 Cars - No Street Parking"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Directly to the property"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No, execpt serive animals"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Magic Village Yards';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Magic Village Yards',
        array['magic village yards', 'mvy']::text[],
        null,
        '04719',
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "APP My Q",
                "value": "Login: 7669 - 7669recife@gmail.com / 7669Owner"
            },
            {
                "label": "APP My Q",
                "value": "Login: 7657 - 7657amazonas@gmail.com / 7657Owner"
            },
            {
                "label": "APP My Q",
                "value": "Login: 7603 - new7603recife@gmail.com / 7603Owner"
            },
            {
                "label": "APP My Q",
                "value": "Login: 3245- 3245brasilia@gmail.com / 3245Owner"
            },
            {
                "label": "APP My Q",
                "value": "Login: 3239- 3239brasilia@gmail.com / 3239Owner"
            },
            {
                "label": "APP My Q",
                "value": "Login: 7634 - 7634recife@mastervh.com /MVHnew7634@"
            },
            {
                "label": "",
                "value": "GATE CODE: 04719 (from Mar 05 to April 05)"
            },
            {
                "label": "",
                "value": "General Gate Code (for emergencies): 01478"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "3151 Pantanal Lane (1 YARDS)",
                "value": "Phone number: 321-203-3570 — Website / E-mail: Veronica.Rubio@fsresidential.com — Wi-Fi Support: Send a text message to:"
            },
            {
                "label": "(407) 502-0566",
                "value": "mvrassoc@mvrassoc.com — David Allen (from Comsat): (407) 346-5502"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Club House",
                "value": "Have to pay for access — Volley"
            },
            {
                "label": "Fitness Center",
                "value": "$100 per day — Tennis"
            },
            {
                "label": "",
                "value": "Kids Playroom"
            },
            {
                "label": "",
                "value": "Restaurant"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Spa",
        "items": [
            {
                "label": "Paradise Pools - William - SPAS",
                "value": "Weekday: Monday???"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "",
                "value": "Trash bin"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: 2 Cars - No Street Parking"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "It must have the office address and unit address",
                "value": "Eg.: JOHN SMITH (3333A) — We don't have units with the letter A"
            },
            {
                "label": "***Unites that have \"A\" must be added to the number",
                "value": "7599 Recife Dr"
            },
            {
                "label": "Pick up hours: 09AM - 5PM (MON-SUN)",
                "value": "Kissimmee, FL 34747"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No, execpt serive animals"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Margaritaville';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Margaritaville',
        array['margaritaville']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "Gate Access",
                "value": "Login — The Resort office will require a completed guest acknowledgement form for each rental guest booking, due no later than the date of guest check-in. Thank you for your assistance with this matter. \" Segue o Form que devera ser encaminhado a MROrentaldocs@artemislifestyles.com"
            },
            {
                "label": "Two gates",
                "value": "Gate I - Formosa Blvd - Attendant — https://drive.google.com/file/d/12I8pXPzCUHVoULpQ3rQu2r0pNyEtf06W/view?usp=drive_link"
            },
            {
                "label": "",
                "value": "Gate II - Margaritaville Blvd - green button"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "",
                "value": "No club house access"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "No club house access",
                "value": "No access"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "8029 Sandy Toes",
                "value": "Weekday: HOA - JP POOL Kissimme"
            },
            {
                "label": "",
                "value": "407 948-5810"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Bench beside the house",
                "value": "Days: Everyday"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: There is spots to park"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Straight to the house"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Paradiso Grande';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Paradiso Grande',
        array['paradiso grande', 'pg']::text[],
        'Paradiso Grande by Park Square Homes, 6001 High Seas Dr, Orlando, FL 32821',
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "To gain access to the Resort just need to show a valid ID, street address, and number of people in your party."
            },
            {
                "label": "",
                "value": "If you are a visiting guest, please present the concierge with an email confirmation of your stay in the community, including the dates of stay, and address."
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "Paradiso Grande by Park Square Homes, 6001 High Seas Dr, Orlando, FL 32821",
                "value": "(844) 774-4636"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "POOL",
                "value": "09AM - 08PM"
            },
            {
                "label": "LAZY RIVER W/WATERFALL",
                "value": "09AM - 08PM"
            },
            {
                "label": "4 ELETRICAL CAR CHARGING STATIONS",
                "value": "09AM - 08PM"
            },
            {
                "label": "FITNESS-CENTER",
                "value": "09AM - 08PM"
            },
            {
                "label": "SUNDRIES STAND",
                "value": "09AM - 08PM"
            },
            {
                "label": "LOBBY W/ FURNITURE AND TV",
                "value": "09AM - 08PM"
            },
            {
                "label": "GAME ROOM",
                "value": "09AM - 08PM"
            },
            {
                "label": "POOL SIDE ACTIVITIES",
                "value": "11AM - 7PM — THERE IS A DAILY LIST"
            },
            {
                "label": "CAFE (NOT OPEN YET)",
                "value": "OPEN @ 9AM"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "High Teck Pools - Erik",
                "value": "Weekday: Tuesday"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Bins",
                "value": "Days: Everyday 9AM"
            },
            {
                "label": "",
                "value": "About the bins, they need to stay at the side of the home."
            },
            {
                "label": "",
                "value": "Please place the garbage bags with your household trash into these bins for pickup prior to 9AM. Tash pickup will begin shortly after 9AM."
            },
            {
                "label": "",
                "value": "All trash needs to be bagged in a household 13 gallon plastic trash bag."
            },
            {
                "label": "",
                "value": "No trash can sit outside overnight."
            },
            {
                "label": "You can contact the Valet Trash Vendor - PG Services at:",
                "value": "Days: Phone 407-952-9117"
            },
            {
                "label": "Antonella Montagner",
                "value": "Community Manager — amontagner@theiconteam.com"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "No assigned parking",
                "value": "Parking Spot: There is overflow parking in front of the house in the clubhouse parking lot"
            },
            {
                "label": "",
                "value": "Parking in the driveway is fine, but unfortunately, there is no street parking."
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "No charge. Straight home. If amazon uses UPS, it may arrive at the door, but it's not guaranteed (check this information directly with the courier). USPS DOES NOT DELIVER"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No, Except 10000 Voyager Way"
            },
            {
                "label": "",
                "value": "4 ELETRICAL CAR CHARGING STATIONS"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Paradise Palms';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Paradise Palms',
        array['paradise palms', 'pp']::text[],
        '8950 Paradise Palms Blvd Kissimmee FL 34747',
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "DwellingLive",
                "value": "Login: https://community.dwellinglive.com/"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "8950 Paradise Palms Blvd Kissimmee FL 34747",
                "value": "(407) 390-0065"
            },
            {
                "label": "Main gate",
                "value": "(407) 390-0065"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Clubhouse/ Heated Pool",
                "value": "7AM - 10PM — Wristband/Front Desk"
            },
            {
                "label": "Gym",
                "value": "Hours: 7AM - 10PM — Access / Code: Front Desk — Court: 1 hour max 4 people"
            },
            {
                "label": "Arcade",
                "value": "Hours: 7AM - 10PM — Access / Code: Front Desk — Court: 1 hour max 4 people"
            },
            {
                "label": "Basketball",
                "value": "8AM - 9PM"
            },
            {
                "label": "Volleyball",
                "value": "8AM - 9PM"
            },
            {
                "label": "Tennis",
                "value": "8AM - 9PM"
            },
            {
                "label": "Bar and Grill",
                "value": "11AM - 08:30PM"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Sunshine Pools - Renato",
                "value": "Weekday: Monday"
            },
            {
                "label": "",
                "value": "8881 Candy Palm Rd - Toninho (407)716-5988"
            },
            {
                "label": "",
                "value": "8953 Bismark Palm - Supreme Breno"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Bench",
                "value": "Days: Valet Trash - 8AM - 10AM - Daily"
            },
            {
                "label": "Dumpster",
                "value": "Days: After 10AM"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes, 3 CARS",
                "value": "Parking Spot: Street parking currently permitted"
            },
            {
                "label": "One on Reserverd PRK",
                "value": "Parking Spot: Additional at clubhouse"
            },
            {
                "label": "Two on Non Reserverd Parking",
                "value": "Parking Spot: NOT ON GRASS"
            },
            {
                "label": "",
                "value": "Commercial vehicle, oversized vehicle, recreational vehicle, or watercraft are not permitted."
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Clubhouse - 30LB less - $10 per package"
            },
            {
                "label": "",
                "value": "Delivered to the Clubhouse for short-term renters and guests are subject to a $10.00 package storage fee. |"
            },
            {
                "label": "",
                "value": "Any mail with tracking numbers are considered packages. The fee of $10 (each) pertains to all packages regardless of size or shape."
            },
            {
                "label": "",
                "value": "Oversized packages weighing over 30 pounds are not accepted at the Clubhouse."
            },
            {
                "label": "",
                "value": "Kindly make arrangements to have someone available to accept delivery of the package(s) at your home for oversized and/or heavy items."
            },
            {
                "label": "",
                "value": "Packages will be held for up to 30 days. Packages not picked up within the time limit may be discarded."
            },
            {
                "label": "",
                "value": "Meals are delivered straight to the house"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "Yes"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Oakwater';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Oakwater',
        array['oakwater']::text[],
        '2705 Wolcott Ln, Kissimmee, FL 34747',
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "#1388"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "2705 Wolcott Ln, Kissimmee, FL 34747",
                "value": "Phone number: (407) 507-3877 — Website / E-mail: oakwaterclubhouse@gmail.com"
            },
            {
                "label": "",
                "value": "oakwaterclubhouse@gmail.com"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Club House",
                "value": "10AM - 6PM — #1388"
            },
            {
                "label": "Pool",
                "value": "08AM - 10PM — Pedestrian code: #4283"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "",
                "value": "No pool"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "",
                "value": "Dumpster - The end of the St Wolcott."
            },
            {
                "label": "",
                "value": "Near clubhouse."
            },
            {
                "label": "",
                "value": "Turn to the right in the resort entrance."
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: Driveway"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Food/Take Out/Restaurant Delivery"
            },
            {
                "label": "",
                "value": "When calling for take out, please provide the address of hte unit you are staying in, as well as the Building Number if known (large blue circle in center of exterior of building)."
            },
            {
                "label": "",
                "value": "This will help the delivery person identify your unit, and get you your food soonest. You’ll also need to provide the driver the PIN you were provided for the Automobile Entrance."
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Regal Palms';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Regal Palms',
        array['regal palms', 'rp']::text[],
        '2700 Sand Mine Rd',
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "Attendant (dwellinglive)"
            },
            {
                "label": "",
                "value": "Insert guest via email reservations@regal-palms.com"
            },
            {
                "label": "",
                "value": "There is a resort fee of 20$+ tax = $22.40 per day"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "2700 Sand Mine Rd",
                "value": "863-424-6141"
            },
            {
                "label": "",
                "value": "Davenport, FL 33897"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Clubhouse",
                "value": "24 Hours — Volleyball"
            },
            {
                "label": "Gym",
                "value": "Hours: 8AM - 11PM — Access / Code: wrist band — Court: Pay Resort"
            },
            {
                "label": "Arcade",
                "value": "Hours: 12PM - 9PM — Access / Code: wrist band — Court: Pay Resort"
            },
            {
                "label": "Pool (heated)",
                "value": "Hours: 8AM - 11PM — Access / Code: wrist band — Court: Pay Resort"
            },
            {
                "label": "Playground",
                "value": "Hours: 9AM - 10PM — Access / Code: wrist band — Court: Pay Resort"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "",
                "value": "No pool"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "",
                "value": "Bring to the dumpster"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "No Parking On Street",
                "value": "Parking Spot: Driveway/diagonal on driveway"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Amazon, UPS"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Regal Oaks';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Regal Oaks',
        array['regal oaks', 'ro']::text[],
        '5780 Golden Hawk Way',
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "#0331"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "5780 Golden Hawk Way",
                "value": "(407) 997-9478"
            },
            {
                "label": "",
                "value": "Kissimmee, FL 34746"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Clubhouse",
                "value": "8AM - 10PM — Tenis"
            },
            {
                "label": "Gym",
                "value": "8AM - 10PM — 6374.0"
            },
            {
                "label": "Pool",
                "value": "8AM - 10PM — Tru clubhouse"
            },
            {
                "label": "Pool Bar",
                "value": "8AM - 10PM"
            },
            {
                "label": "Water Slide",
                "value": "8AM - 10PM"
            },
            {
                "label": "Minimarket",
                "value": "8AM - 10PM"
            },
            {
                "label": "Ice Cream and Fudge Bar",
                "value": "8AM - 10PM"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Spa",
        "items": [
            {
                "label": "Paradise Pools - William",
                "value": "Weekday: Monday"
            },
            {
                "label": "2608 - Personal Pool Guy",
                "value": "Weekday: Thursday"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Bench",
                "value": "Days: Everyday"
            },
            {
                "label": "",
                "value": "No holidays"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "",
                "value": "No assigned parking"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Fedex, UPS, DHL to home"
            },
            {
                "label": "",
                "value": "USPS/Amazon to clubhouse (no fees)"
            },
            {
                "label": "",
                "value": "The only packages from usps are the only that the front desk will be accept,"
            },
            {
                "label": "",
                "value": "and it has to have the town house address"
            },
            {
                "label": "",
                "value": "Packages will be hold for 14 days only"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Reunion';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Reunion',
        array['reunion']::text[],
        null,
        '2121#',
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "Gate Access",
                "value": "Login — *Code to enter the building through the glass door"
            },
            {
                "label": "Attendant / Gate System",
                "value": "2121#"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "Club House",
                "value": "Phone number: No Access — Website / E-mail: Caminho alternativo Reunion Blvd, Kissimmee, FL 34747 | https://maps.app.goo.gl/hMRVwourLMQkv4288"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "William",
                "value": "Weekday: Fridays"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "",
                "value": "Regular - Mon,Thu,Sat / Recycle - Wed / Bulk - Thu"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "NO PACKAGES"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Seasons';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Seasons',
        array['seasons']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "No Gate"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "",
                "value": "No clubhouse"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Garcia Pools - Rodrigo",
                "value": "Weekday: Wednesday"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Trash bin beside the house",
                "value": "Days: Rec WED Morning / Reg THU Morning"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes, no limit.",
                "value": "Parking Spot: All vehicles must be parked on one side of the road, as indicated by the signs or in the driveway"
            },
            {
                "label": "Commercial vehicles are not allowed",
                "value": "Parking Spot: No overflow parking available"
            },
            {
                "label": "Recreational vehicles and trailers are not allowed",
                "value": "Parking Spot: Street parking is allowed according to posted signs"
            },
            {
                "label": "",
                "value": "Vans must be parked in the driveway"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Straight to the house"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Seven Dwarfs';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Seven Dwarfs',
        array['sd', 'seven dwarfs']::text[],
        '2600 Jonagold Blvd',
        null,
        $json$[
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "2600 Jonagold Blvd",
                "value": "407-396-0673"
            },
            {
                "label": "",
                "value": "Kissimmee, FL 34747"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Gym",
                "value": "09AM - 05PM — No code"
            },
            {
                "label": "Pool/Spa",
                "value": "09AM - 05PM — No code"
            },
            {
                "label": "Playground",
                "value": "09AM - 05PM — No code"
            },
            {
                "label": "Splash Pad",
                "value": "09AM - 05PM — No code"
            },
            {
                "label": "Tennis",
                "value": "24 Hours — No code"
            },
            {
                "label": "Basketball",
                "value": "24 Hours — No code"
            },
            {
                "label": "VolleyBall",
                "value": "24 Hours — No code"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "",
                "value": "No pool"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Dumpster",
                "value": "Days: End of the Street"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: Spots"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Secret Lake Resorts';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Secret Lake Resorts',
        array['secret lake resorts', 'slr']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "1129"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "",
                "value": "3176 Feltrim Pl, Kissimmee, FL 34747"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Pool access",
                "value": "#0413"
            },
            {
                "label": "Exercise Room",
                "value": "9072.0"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "",
                "value": "No Private pool"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "",
                "value": "No trash collection. Two garbage compactors next to the clubhouse outside the gate to the left."
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Guest must write out the full address with the unit number 204."
            },
            {
                "label": "",
                "value": "Delivery at door // NO USPS"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Sonoma';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Sonoma',
        array['sonoma']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "Attendant",
                "value": "Login: App Zuul - QR code needed"
            },
            {
                "label": "",
                "value": "https://docs.google.com/spreadsheets/d/15rnSnXSX9jOkxR0Gn9teNs3WUJYIHeWf_RzN1hzDBRg/edit?gid=701856462#gid=701856462"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Fitness Center",
                "value": "6 AM - 11 PM — 1762*"
            },
            {
                "label": "Pool Area",
                "value": "9 AM - 11 PM — 1762*"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Garcia Pools - Rodrigo",
                "value": "Weekday: Wednesday"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Bench",
                "value": "Days: Daily - After 08AM"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: Parking is limited to the driveway. | While additional parking is located near the lake, it is subject to availability."
            },
            {
                "label": "",
                "value": "Van allowed (Maximum of 12 seats)"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Amazon straight to the house"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Solara';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Solara',
        array['solara']::text[],
        '1575 Carey Palm Circle, Kissimmee, FL 34747',
        '1575',
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "Attendant/confirmation letter",
                "value": "Info: Solara Resort does not have any gate code. | Guest must go through the main gate to register with the attendant. | Once you get to the main gate, inform the attendant the property address that you are checking into. | After that, the attendant will send you to another gate that they will open on their end and you will have access to the unit. | Please see the address for the main gate below: 1575 Carey Palm Circle (main guard gate located at Westside Boulevard and 9002 Sunset Palms. Use the left lane to register with the guard and enter the resort.) |"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "1575 Carey Palm Circle, Kissimmee, FL 34747",
                "value": "Phone number: (407) 479-5500 — Website / E-mail: Edward Rios at: ERios@lelandmanagement.com | or (407) 469-5302"
            },
            {
                "label": "",
                "value": "After-Hours Emergency at: | (866) 263-3987"
            },
            {
                "label": "",
                "value": "Resident Support at: | residentsupport@lelandmanagement.com"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Club House",
                "value": "08AM - 8PM — Basketball"
            },
            {
                "label": "Pool Area",
                "value": "Hours: 08AM - 8PM — Access / Code: #1020 — Court: Volley"
            },
            {
                "label": "Tikibar",
                "value": "08AM - 8PM — Soccer"
            },
            {
                "label": "Flowrider",
                "value": "Paid in Solara (fee is required for the FlowRider©)"
            },
            {
                "label": "Fitness Center",
                "value": "08AM - 8PM"
            },
            {
                "label": "Playground",
                "value": "08AM - 8PM"
            },
            {
                "label": "Restaurant",
                "value": "11AM - 8PM"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Paradise Pools - William",
                "value": "Weekday: Thursday / Friday (Carey Palm)"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Brown Bin on the porch",
                "value": "Days: Daily, no holidays"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes, 6 per house",
                "value": "Parking Spot: Parking on the street, grass, or sidewalk is NOT allowed."
            },
            {
                "label": "No RVS, no Trailers,",
                "value": "Parking Spot: There are additional parking spots for guests on the street Herrons Green Path."
            },
            {
                "label": "",
                "value": "no Buses, no Golf Carts, no Boats"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "Solara clubhouse also does not receive packegs.",
                "value": "https://docs.google.com/document/d/1Slc1vFkUmKtuahMSeUhFUrL2SPGyNKHvDRUmj6XuR90/edit?tab=t.0"
            },
            {
                "label": "UPS and Fedex deliver in the house, USPS not.",
                "value": "The new brand houses do not have address to mail, if the guest ask for, the alternative is indicate the amazon locker."
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "Yes, the pets must be leashed"
            },
            {
                "label": "",
                "value": "Only service animal are allowed in amenities"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Solterra';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Solterra',
        array['solterra']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "Gate Access - Max 5 drivers",
                "value": "Login: https://solterra.access.proptia.com/login"
            },
            {
                "label": "Only the drivers, not all the names",
                "value": "Login: https://docs.google.com/spreadsheets/d/15rnSnXSX9jOkxR0Gn9teNs3WUJYIHeWf_RzN1hzDBRg/edit?gid=701856462#gid=701856462"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "",
                "value": "5200 Solterra Blvd, Davenport, FL 33837"
            },
            {
                "label": "",
                "value": "Towing company - 863-299-9966"
            },
            {
                "label": "",
                "value": "Gate House - 863 - 547-6201"
            },
            {
                "label": "",
                "value": "HOA Customer Care - 877 - 221-6919"
            },
            {
                "label": "",
                "value": "Bulck pick up - 407 - 360-3290"
            },
            {
                "label": "",
                "value": "CLUBHOUSE - 863-547-9839"
            },
            {
                "label": "",
                "value": "Non Emergency Line - 863-298-6200"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Fitness Center",
                "value": "Hours: 5AM - 11 PM — Access / Code: August 3361# — Amenitie Fee: 12 $35 , 12+ $45 — Court: Tennis"
            },
            {
                "label": "Community Pool",
                "value": "9AM - 10PM — * ONE-TIME FEE PER HOUSE PER RESERVATION"
            },
            {
                "label": "Lazy river",
                "value": "11AM - DUSK — PAYMENT IN THE CLUB HOUSE"
            },
            {
                "label": "|",
                "value": "The Solterra resort charges an amenity fee to use the clubhouse. There is a one-time fee per house, per reservation. Up to 12 people will be $35, and more than that, $45. Payment will be made at the clubhouse."
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Blue dive pools - Regina",
                "value": "Weekday: Tuesday (Big pools) / Friday (Small Pools)???"
            },
            {
                "label": "",
                "value": "4735 Terrasoneta - Owner's Friend"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Bench",
                "value": "Days: Daily, no holidays. After 7AM"
            },
            {
                "label": "",
                "value": "DUMPSTER - Main street near Oakbourne st"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: Only 5 parking passes, assigned spots"
            },
            {
                "label": "",
                "value": "Street parking is not permitted. | Please make sure cars are not parked on the grass or blocking the sidewalk. | Cars parked in a tow-away zone or parked on property without permission may be towed at the car owner's expense. | Some extra parking spots may be available for guests on Oakview Dr, Oakrise Lp, Oakmoss Loop, Oak Grn Lp, and Broak Oak drive. Keep in mind that these spots are not reserved and may not be available."
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Packages are delivered straight to the house. There's no fee."
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "Yes, 2 pets per home"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Summerville';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Summerville',
        array['summerville']::text[],
        null,
        '1982',
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "Main Gate: #1982"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "2621 Sunrise Shores Drive, Kissimmee, FL 34747",
                "value": "(407) 851-1881"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Club House",
                "value": "9AM - 5PM — Bathrooms: 1218#"
            },
            {
                "label": "Fitness Center",
                "value": "6AM - 10PM — 1218#"
            },
            {
                "label": "Pool Area",
                "value": "SUNRISE - SUNSET — *9644#"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "",
                "value": "No Pool"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Bench",
                "value": "Days: Daily - 7AM - 9AM"
            },
            {
                "label": "Trash bags outside bench will not be picked up.",
                "value": "Days: After 11AM the trash will not be collected."
            },
            {
                "label": "",
                "value": "Card boxes must be broken and placed in the dumpster"
            },
            {
                "label": "",
                "value": "dumpster located at end of sunvile ave"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "guest has 1 assigned spot",
                "value": "Parking Spot: Assigned Space"
            },
            {
                "label": "More than one vehicle",
                "value": "Parking Spot: Spots that say \"guests\""
            },
            {
                "label": "",
                "value": "No commercial or recreation vehicle"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Straight to the house, clubhouse no"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "Yes"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Spectrum at Reunion';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Spectrum at Reunion',
        array['sar', 'spectrum at reunion']::text[],
        null,
        '2121#',
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "Attendant"
            },
            {
                "label": "",
                "value": "49-215 - Building Door code 2121#"
            },
            {
                "label": "",
                "value": "36-206 Building has an open door, no code yet"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "",
                "value": "No Access, no resort fee"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes, there is a parking spots far away from the buildings,",
                "value": "Parking Spot: 36-206 - Far way from the parking spot"
            },
            {
                "label": "but they can drop off in front of the buildings and park in the parking spot.",
                "value": "Parking Spot: 49-215 - The nearest from parking spot"
            },
            {
                "label": "",
                "value": "Golf Carts rides around the area, they give drives for free"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Storey Lake - Phase 1';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Storey Lake - Phase 1',
        array['slp', 'storey lake - phase 1']::text[],
        '4715 Kings Castle Cir, Kissimmee, FL 34746',
        '1967',
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "Gate Access/ 1967 (Pedestrian gate)",
                "value": "Gate house info: Main Gate: Windermere Guard House (4700 Windermere Ave) : 407-572-8120"
            },
            {
                "label": "",
                "value": "Side Gate***: Fable St, Kissimmee, FL 34746"
            },
            {
                "label": "",
                "value": "*** No attendat at the side gate"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "4715 Kings Castle Cir, Kissimmee, FL 34746",
                "value": "407-787-8700"
            },
            {
                "label": "",
                "value": "Vening Security Patrol: 863-337-1622"
            },
            {
                "label": "",
                "value": "*Kings Castle Circle and Sleepy Hollow are the streets near the club house"
            },
            {
                "label": "Shuttle Service is available to all Guest to and from the unit*",
                "value": "Call (407) 279 -8999 for a ride"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Club House (No Work Space)",
                "value": "Hours: 10AM - 6PM — Access / Code: Confirmation Letter — Court: Volleyball"
            },
            {
                "label": "Fitness Center",
                "value": "Hours: 10AM - 10PM — Access / Code: 67096.0 — Court: Basketball"
            },
            {
                "label": "Game Room",
                "value": "11AM - 9PM"
            },
            {
                "label": "Pool Area",
                "value": "9AM - 9PM — Target Pool: 67500 / Terrace Pool: 6750"
            },
            {
                "label": "",
                "value": "Kayak"
            },
            {
                "label": "",
                "value": "Mini Golf"
            },
            {
                "label": "",
                "value": "Cart Golf - FREE - Club house - (407) 279 -8999"
            },
            {
                "label": "",
                "value": "***Pool Near buildings: 3100 Paradox Cir, Kissimmee, FL 34746"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Sunshine Pools - Renato",
                "value": "Weekday: Tuesday ??? - Gatsby, Pequod, Romeo, Sleepy, Clock, Crusoe, Fable, Kings, Love Storey"
            },
            {
                "label": "High Teck Pools - Erik",
                "value": "Weekday: Friday - Windermere, Memories, Lullaby, Dedication"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Bench - Outside in front of the main door",
                "value": "Days: Daily"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "",
                "value": "Parking Regulations"
            },
            {
                "label": "",
                "value": "- Guest Parking Passes: Parking passes are not required for guest vehicles. However, all vehicles must comply with posted parking rules."
            },
            {
                "label": "",
                "value": "- Vehicle Limit Per Property: 3 to 4 vehicles per property, depending on the driveway size. Street parking is not a substitute for driveway space."
            },
            {
                "label": "",
                "value": "- Overflow Parking: esignated overflow parking areas are available throughout the community. These are marked and typically located near common areas or pools."
            },
            {
                "label": "",
                "value": "- Street Parking: Street parking is not permitted overnight and may be subject to towing. Guests should park only in designated areas or driveways. |"
            },
            {
                "label": "",
                "value": "- Vehicle Size Restrictions: Oversized vehicles such as RVS, trailers, or large commercial trucks are not permitted. | - Small passenger vans (e.g., 12-passenger vans) are generally allowed as long as they fit within the property’s parking space and do not obstruct traffic."
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Packages are delivered straight to the house. Clubhouse No/ USPS No"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "Yes"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Storey Lake - Phase 2';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Storey Lake - Phase 2',
        array['slp', 'storey lake - phase 2']::text[],
        'First Gate: 4674 Target Blvd, Kissimmee, FL 34746',
        '1967',
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "Gate Access / 1967 (Pedestrian gate)",
                "value": "Gate house info: Main Gate II* First Gate: 4674 Target Blvd, Kissimmee, FL 34746"
            },
            {
                "label": "",
                "value": "Main Gate II* Second Gate: 2894 Storey Cove Ave, Kissimmee, FL 34746"
            },
            {
                "label": "",
                "value": "*** Both of these gates are also unstaffed. Guests should proceed directly to this gate and use their QR code or contact Security for access."
            },
            {
                "label": "Shuttle Service is available to all Guest to and from the unit*",
                "value": "Gate house info: Call (407) 279 -8999 for a ride"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "First Gate: 4674 Target Blvd, Kissimmee, FL 34746",
                "value": "407-787-8700"
            },
            {
                "label": "Second Gate: 2894 Storey Cove Ave, Kissimmee, FL 34746",
                "value": "Vening Security Patrol: 863-337-1622"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Clubhouse (4636 Target Blvd, Kissimmee)",
                "value": "Hours: 10AM - 6PM — Access / Code: Confirmation Letter — Court: Volleyball"
            },
            {
                "label": "Fitness Center",
                "value": "Hours: 10AM - 10PM — Access / Code: 67096.0 — Court: Basketball"
            },
            {
                "label": "Game Room",
                "value": "11AM - 9PM"
            },
            {
                "label": "Pool*** Area",
                "value": "9AM - 9PM — Target Pool: 67500 / Terrace Pool: 6750"
            },
            {
                "label": "Kayak",
                "value": "$15 / 30min"
            },
            {
                "label": "Mini Golf",
                "value": "$7 adults $5 for kids"
            },
            {
                "label": "",
                "value": "Cart Golf - FREE - Club house - (407) 279-8999"
            },
            {
                "label": "",
                "value": "***POOL ADDRESS: 4636 Target Blvd, Kissimmee, FL 34746"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Sunshine Pools - Renato",
                "value": "Weekday: ??? - Narrative, Stanza, Target, Bookmark, Storey Cove"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Bench - Outside in front of the main door",
                "value": "Days: Daily"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "",
                "value": "Parking Regulations"
            },
            {
                "label": "",
                "value": "- Guest Parking Passes: Parking passes are not required for guest vehicles. However, all vehicles must comply with posted parking rules."
            },
            {
                "label": "",
                "value": "- Vehicle Limit Per Property: 3 to 4 vehicles per property, depending on the driveway size. Street parking is not a substitute for driveway space."
            },
            {
                "label": "",
                "value": "- Overflow Parking: esignated overflow parking areas are available throughout the community. These are marked and typically located near common areas or pools."
            },
            {
                "label": "",
                "value": "- Street Parking: Street parking is not permitted overnight and may be subject to towing. Guests should park only in designated areas or driveways. |"
            },
            {
                "label": "",
                "value": "- Vehicle Size Restrictions: Oversized vehicles such as RVS, trailers, or large commercial trucks are not permitted. | - Small passenger vans (e.g., 12-passenger vans) are generally allowed as long as they fit within the property’s parking space and do not obstruct traffic."
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Packages are delivered straight to the house. Clubhouse No/ USPS No"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "Yes"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Storey Lake - Phase 3';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Storey Lake - Phase 3',
        array['slp', 'storey lake - phase 3']::text[],
        null,
        null,
        $json$[
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "(No exact address for this gate)",
                "value": "407-787-8700"
            },
            {
                "label": "Clubhouse - 2700 Reading Trail, Kissimmee, FL 34746",
                "value": "vening Security Patrol: 863-337-1622"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "BROSON CLUB - Club House",
                "value": "Hours: 9AM - 9PM — Access / Code: For registration, please have your — Court: Basketball"
            },
            {
                "label": "Pool Area",
                "value": "9AM - 9PM — confirmation of stay or QR code"
            },
            {
                "label": "Outdoor Table Tenis",
                "value": "9AM - 9PM — in hand and be prepared to present"
            },
            {
                "label": "Game Room with Pool Table, Cards Table, Chess Board",
                "value": "9AM - 9PM — documents to concierge"
            },
            {
                "label": "Fitness Center (2700 Reading Trail, Kissimmee)",
                "value": "9AM - 9PM"
            },
            {
                "label": "Cart Golf - FREE - Club house - (407) 279 -8999",
                "value": "9AM - 9PM"
            },
            {
                "label": "",
                "value": "9AM - 9PM"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Garcia Pool- Rodrigo",
                "value": "Weekday: Tuesday - Quote, Simile, Scrapbook, Rhyme, Scene, Reading, Oxymoron"
            },
            {
                "label": "Supreme Pools - Breno",
                "value": "Weekday: Monday - Prologue, Protagonist, Paragraph and Penelope"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Bench - Outside in front of the main door",
                "value": "Days: Daily"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "",
                "value": "Parking Regulations"
            },
            {
                "label": "",
                "value": "- Guest Parking Passes: Parking passes are not required for guest vehicles. However, all vehicles must comply with posted parking rules."
            },
            {
                "label": "",
                "value": "- Vehicle Limit Per Property: 3 to 4 vehicles per property, depending on the driveway size. Street parking is not a substitute for driveway space."
            },
            {
                "label": "",
                "value": "- Overflow Parking: esignated overflow parking areas are available throughout the community. These are marked and typically located near common areas or pools."
            },
            {
                "label": "",
                "value": "- Street Parking: Street parking is not permitted overnight and may be subject to towing. Guests should park only in designated areas or driveways. |"
            },
            {
                "label": "",
                "value": "- Vehicle Size Restrictions: Oversized vehicles such as RVS, trailers, or large commercial trucks are not permitted. | - Small passenger vans (e.g., 12-passenger vans) are generally allowed as long as they fit within the property’s parking space and do not obstruct traffic."
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Packages are delivered straight to the house. Clubhouse No/ USPS No"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "Yes"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Sunset Lakes';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Sunset Lakes',
        array['sl', 'sunset lakes']::text[],
        '8506 Blue Horizon Ct, Kissimmee, FL 34747',
        '1512#',
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "Code 1512#"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "8506 Blue Horizon Ct, Kissimmee, FL 34747",
                "value": "937-554-5777"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Clubhouse",
                "value": "9AM - 6PM — No"
            },
            {
                "label": "",
                "value": "Pool with changing Facilities"
            },
            {
                "label": "",
                "value": "Fishing pier and cabana"
            },
            {
                "label": "",
                "value": "2 fishing Lakes"
            },
            {
                "label": "",
                "value": "Sun loungers"
            },
            {
                "label": "",
                "value": "Play area"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Supreme - Breno",
                "value": "Weekday: Wednesday"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Bin Trash",
                "value": "Days: Thursday Morning"
            },
            {
                "label": "Recycle",
                "value": "Days: Wednesday"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "3.0",
                "value": "Parking Spot: Parkway | Extra parking next to the clubhouse"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Regular delivery to the property | UPS/USPS/Amzon etc"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Terra Verde';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Terra Verde',
        array['terra verde', 'tv']::text[],
        '109 Madiera Beach Blvd - Kissimmee, FL 34746',
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "Call Attendant at 407-997-4082 / Send email Frontdesk@terraverderesort.net"
            },
            {
                "label": "",
                "value": "Send email Frontdesk@terraverderesort.net"
            },
            {
                "label": "",
                "value": "Send email Frontdesk@terraverderesort.net"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "109 Madiera Beach Blvd - Kissimmee, FL 34746",
                "value": "Phone number: 407-396-2327 — Website / E-mail: Frontdesk@terraverderesort.net"
            },
            {
                "label": "General Manager, Jeremy Bulcock - 407-574-7011",
                "value": "Gm@terraverderesort.net"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Club House",
                "value": "8AM - 9PM — Sport"
            },
            {
                "label": "Game Room",
                "value": "8AM - 9PM — Mini golf"
            },
            {
                "label": "Fitness Center",
                "value": "8AM - 9PM — Basketball"
            },
            {
                "label": "Pool Area",
                "value": "8AM - 9PM"
            },
            {
                "label": "Cineroom",
                "value": "8AM - 9PM"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Garcia Pools - Rodrigo - Pools",
                "value": "Weekday: Monday"
            },
            {
                "label": "William - Spas",
                "value": "Weekday: Monday"
            },
            {
                "label": "",
                "value": "4725 - Personal Pool Guy"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Bench for TH & Containters for Homes/ Dumpster near the clubhouse.",
                "value": "Days: Daily, morning/afternoon/ Except Sundays"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: Parking Spots in the street"
            },
            {
                "label": "Guests must register their stay at the clubhouse within 24 hours of arrival",
                "value": "Parking Spot: Also at registration, guests must purchase a nonrefundable $25 gate card for each vehicle on property."
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "No Charge/ USPS is not permitted"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "Yes"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Terra Esmeralda';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Terra Esmeralda',
        array['te', 'terra esmeralda']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "#1022"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "",
                "value": "4715 Terra Esmeralda:  01022"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "No Pool",
                "value": "Weekday: No"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "",
                "value": "Dumpster"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "2 cars",
                "value": "Parking Spot: Parking in front of the unit"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'The Hub At Westside';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'The Hub At Westside',
        array['hub at westside', 'thaw', 'the hub at westside']::text[],
        null,
        '3361#',
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "o número da casa (exemplo: Casa 3361 o codigo sera 3361 ) | 1090 or 3205"
            },
            {
                "label": "3361 Tranquil Trail",
                "value": "Parking Pass / Parking ID is required — 3361#"
            },
            {
                "label": "3421 Tranquil Trail",
                "value": "Parking Pass / Parking ID is required — 3421#"
            },
            {
                "label": "3248 Tranquil Trail",
                "value": "Parking Pass / Parking ID is required — 3205#"
            },
            {
                "label": "3444 Tranquil Trail",
                "value": "Parking Pass / Parking ID is required — 3444#"
            },
            {
                "label": "3205 Tranquil Trail (REQUIRED) / 3205 Energy Drive (NOT REQUIRED)",
                "value": "Parking Pass / Parking ID is required — 3444#"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "3370 Tranquil Trail, Kissimmee, FL 34747",
                "value": "Phone number: (407) 770-1748 — Website / E-mail: jmiranda@empirehoa.com"
            },
            {
                "label": "",
                "value": "Empire Management Group / Jorge Miranda"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "CLUBHOUSE",
                "value": "1090#"
            },
            {
                "label": "GYM",
                "value": "08AM - 08PM"
            },
            {
                "label": "POOL",
                "value": "08 AM - 08PM"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "",
                "value": "No pool"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "",
                "value": "*TRASH DISPOSAL | Please place your trash in bags and dispose them in the dumpster located near the clubhouse. | The HOA strictly prohibits leaving trash bags at the front door, even temporarily. | Failure to comply will result in a fine at the guest's expense."
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "3361 Tranquil Trail",
                "value": "Parking Spot: Parking Pass / Parking ID is required — Gate code: 3361#"
            },
            {
                "label": "3421 Tranquil Trail",
                "value": "Parking Spot: Parking Pass / Parking ID is required — Gate code: 3421#"
            },
            {
                "label": "3248 Tranquil Trail",
                "value": "Parking Spot: Parking Pass / Parking ID is required — Gate code: 3248#"
            },
            {
                "label": "3444 Tranquil Trail",
                "value": "Parking Spot: Parking Pass / Parking ID is required — Gate code: 3444#"
            },
            {
                "label": "3205 Tranquil Trail (REQUIRED) / 3205 Energy Drive (NOT REQUIRED)",
                "value": "Parking Spot: Parking Pass / Parking ID is required — Gate code: 3205#"
            },
            {
                "label": "2 Car Max",
                "value": "Cars without Id will be towed"
            },
            {
                "label": "",
                "value": "Parking ID's should be at the unit (if not, contact PM)"
            },
            {
                "label": "",
                "value": "Parking is free."
            },
            {
                "label": "",
                "value": "It is marked and limited to 2 parking spots."
            },
            {
                "label": "",
                "value": "The Parking Hanger must be placed your car during the stay."
            },
            {
                "label": "",
                "value": "Cars parked in a tow-away zone or parked on property without permission may be towed at the car owner's expense."
            },
            {
                "label": "",
                "value": "There is a plate and two tags that has to be placed in the car to not be towed. It is in the house beside the main door"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "It is not allowed to send packages, only owners"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "Yes"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "YES"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'The Hub At Westside Reserve';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'The Hub At Westside Reserve',
        array['hub at westside reserve', 'thawr', 'the hub at westside reserve']::text[],
        null,
        '9125#',
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "GATE ACCESS: 9125# (JAN 2026)"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "(407) 644-4406",
                "value": "hubres@topnotchcam.com"
            },
            {
                "label": "",
                "value": "Top Notch Community Association Management"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "",
                "value": "THE HUB AT WESTSIDE RESERVE AMENITIES ARE UNDER CONSTRUCTION."
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "",
                "value": "No pool"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "",
                "value": "*TRASH DISPOSAL | Please place your trash in bags and dispose them in the dumpster located on Sustainable Street. | The HOA strictly prohibits leaving trash bags at the front door, even temporarily. | Failure to comply will result in a fine at the guest's expense."
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "2 Car Max",
                "value": "Parking Spot: ID's are not required FOR NOW"
            },
            {
                "label": "",
                "value": "The Hub - Parking permit is not required. Only houses in Phase 1 (Check the other tab, “The Hub at Westside,” to see the list of Phase 1 homes). | Information updated on 10/14/2025 by PM"
            },
            {
                "label": "",
                "value": "Parking is free."
            },
            {
                "label": "",
                "value": "It is marked and limited to 2 parking spots."
            },
            {
                "label": "",
                "value": "Vehicle in violation of parking policy will be towed at the guest's expense."
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "It is not allowed to send packages, only owners"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "Yes"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "YES"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'The Mannors at Westridge';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'The Mannors at Westridge',
        array['mannors at westridge', 'the mannors at westridge', 'tmaw']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "#9142"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "No Club house",
                "value": "No Club house"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "No",
                "value": "Hours: No — Access / Code: No code — Court: No court"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Renato",
                "value": "Weekday: Tuesday"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "TRASH - OUT",
                "value": "Days: Sunday"
            },
            {
                "label": "TRASH PICK UP",
                "value": "Days: Monday"
            },
            {
                "label": "RECYCLE - OUT",
                "value": "Days: Thursday"
            },
            {
                "label": "RECYCLE - PICK UP",
                "value": "Days: Friday"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: Parkway"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Straight to the house"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'The Retreat';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'The Retreat',
        array['retreat', 'the retreat', 'tr']::text[],
        '17400 Placidity Ave',
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "No Gate"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "17400 Placidity Ave",
                "value": "407-333-7787"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Playground",
                "value": "Hours: 6AM - 10PM — Access / Code: Key Fob — Court: Tennis"
            },
            {
                "label": "",
                "value": "Fitness Center"
            },
            {
                "label": "",
                "value": "Swimming Pool"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Sunshine Pools - Renato",
                "value": "Weekday: Tuesday"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Valet",
                "value": "Days: Tuesday"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: 1 Car Assigned Spot + others spots unmarked"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Straight to the House / Amazon and UPS"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            },
            {
                "label": "",
                "value": "Shuttle"
            },
            {
                "label": "",
                "value": "To Parks?"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Veranda';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Veranda',
        array['veranda']::text[],
        '4446 Nirvana Pkwy, Kissimmee, FL 34746',
        '0321',
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "Attendant 6 AM to 6 PM (Pedestrian gate: 0321)"
            },
            {
                "label": "",
                "value": "Guests - #5618 / Vendors - #8156"
            },
            {
                "label": "",
                "value": "Gate Access: 2603 Pricess Way, Kissimmee - FL"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "4446 Nirvana Pkwy, Kissimmee, FL 34746",
                "value": "Phone number: (407) 201-5233 — Website / E-mail: communitycare@sentrymgt.com"
            },
            {
                "label": "GATE CODE: #5618",
                "value": "Marie Schockling - The contact info is for the PM only. They do NOT talk to guests."
            },
            {
                "label": "Towing Company - Pure Towing",
                "value": "Phone number: (407) 955-0696 — Website / E-mail: puretowingroadside@gmail.com"
            },
            {
                "label": "",
                "value": "Clubhouse access code: 1762*"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Club House",
                "value": "9AM - 5PM — 0321-5435#"
            },
            {
                "label": "Fitness Center",
                "value": "5435#/ 8363#"
            },
            {
                "label": "Pool Area",
                "value": "Bathroom: 8363# Pool: 0321/ 8363#"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "",
                "value": "Supreme Pools - Breno"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Bench",
                "value": "Days: Daily"
            },
            {
                "label": "",
                "value": "Dumpster in club house: 4446 Nirvana Pkwy, Kissimmee, FL 34746"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "No Parking on Street - VERIFY LISTING!",
                "value": "Driveway only — Up to 4 cars in the drivel + 1 Parallel (check if garage is available for parking)"
            },
            {
                "label": "No coomercial, recreational or trailers",
                "value": "No overflorw parking — There are additional spots on Shiva Loop Street"
            },
            {
                "label": "Towing Company - Pure Towing - (407) 955-0696",
                "value": "Parking Spot: No overnight parking at the Club house"
            },
            {
                "label": "",
                "value": "Vans must be parked in the driveway."
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "No USPS / Amazon directly to home"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Venetian Bay';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Venetian Bay',
        array['vb', 'venetian bay']::text[],
        '4001 Venetian Bay Dr, Kissimmee, FL 34741',
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "https://venetianbayvillages.parkingattendant.com/y4fn7q9psd2anehba0djpahb6w/permits/temporary/new?policy=4a2a3tf0jx06s5dftyedt4p8x44",
                "value": "Login: Gate Access"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "4001 Venetian Bay Dr, Kissimmee, FL 34741",
                "value": "14073434933"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "",
                "value": "4001 Venetian Bay Dr, Kissimmee, FL 34741"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Vista Cay';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Vista Cay',
        array['vc', 'vista cay']::text[],
        '4874 Cayview Ave, Orlando, 32819',
        '6358#',
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "6358#"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "4874 Cayview Ave, Orlando, 32819",
                "value": "https://vistacayorlando.com/"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Club house - 2 Pools",
                "value": "ACCESS CARD"
            },
            {
                "label": "",
                "value": "Gym"
            },
            {
                "label": "",
                "value": "Bar"
            },
            {
                "label": "",
                "value": "Concierge"
            },
            {
                "label": "",
                "value": "Poolside bar"
            },
            {
                "label": "",
                "value": "BBQ grills and picnic tables"
            },
            {
                "label": "",
                "value": "Game room"
            },
            {
                "label": "",
                "value": "Kids splash pool at the Clubhouse"
            },
            {
                "label": "",
                "value": "Two-mile jogging trail along the lake"
            },
            {
                "label": "",
                "value": "Business center"
            },
            {
                "label": "",
                "value": "Fitness Center"
            },
            {
                "label": "",
                "value": "Sundries shop"
            },
            {
                "label": "",
                "value": "Sports Court"
            },
            {
                "label": "",
                "value": "Kids Playground"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "No pool",
                "value": "• Kids splash pool at the Clubhouse"
            },
            {
                "label": "",
                "value": "• Two-mile jogging trail along the lake"
            },
            {
                "label": "",
                "value": "• Business center"
            },
            {
                "label": "TRASH",
                "value": "• Fitness Center"
            },
            {
                "label": "Location",
                "value": "Weekday: Days — • Game room: • Sundries shop"
            },
            {
                "label": "Bench",
                "value": "Weekday: Weekdays — • Game room: • Sports Court"
            },
            {
                "label": "",
                "value": "• Kids Playground"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes,",
                "value": "Parking Spot: In front of the building"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "To Club house - 4874 Cayview Ave, Orlando, 32819",
                "value": "If the online seller uses USPS, it will not get delivered as the Post Office does not recognize vacation homes as regular addresses and the package will be returned back to the sender. | Only UPS, DHL and FEDEX delivers them. | In some resorts the packages are delivered to the clubhouse. Fees may apply. | Some resorts may not accept them. | Keep in mind we are not responsible for unexpected issues with your online purchases. If you have any questions, please contact us."
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "YES, Pet fee $85 - $225"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "YES"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'West Lucaya';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'West Lucaya',
        array['west lucaya', 'wl']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "#4312"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "3241 Wish Avenue - Kissimmee, FL 34747",
                "value": "321-319-5600"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Fitness Center",
                "value": "9AM - 6PM"
            },
            {
                "label": "",
                "value": "Swiming Pool"
            },
            {
                "label": "",
                "value": "Grill spot - at Cupid Pl"
            },
            {
                "label": "",
                "value": "Kids Room"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "",
                "value": "No pool"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "",
                "value": "Dumpster"
            },
            {
                "label": "",
                "value": "1 at Silver Place St"
            },
            {
                "label": "",
                "value": "1 at Oyester Ln"
            },
            {
                "label": "",
                "value": "1 at Cupid Pl"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: Parkings spots"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Amazon / UPS"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Wilshire Oaks';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Wilshire Oaks',
        array['wilshire oaks', 'wo']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "No Gate"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "",
                "value": "No club house"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Garcia Pools - Rodrigo",
                "value": "Weekday: Wednesday"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Trash bin",
                "value": "Days: Once a week"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes, No limit",
                "value": "Parking Spot: Driveway only"
            },
            {
                "label": "No commercial, no recreational and no traillers",
                "value": "Parking Spot: No overflow parking"
            },
            {
                "label": "",
                "value": "No strret parking"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Straight to the house"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Windsor Island';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Windsor Island',
        array['wi', 'windsor island']::text[],
        '1104 Aloha Blvd, Davenport, FL 33897',
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "Attendant (Adults must be registered)",
                "value": "Login: https://docs.google.com/spreadsheets/d/15rnSnXSX9jOkxR0Gn9teNs3WUJYIHeWf_RzN1hzDBRg/edit?gid=701856462#gid=701856462"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "1104 Aloha Blvd, Davenport, FL 33897",
                "value": "Phone number: 863-438-5950 (Front Desk) — Website / E-mail: windsorislandfrontdesk@gmail.com"
            },
            {
                "label": "",
                "value": "Extra Vehicle Request Policy: | Any request for an extra vehicle must be submitted no later than four weeks prior to the reservation"
            },
            {
                "label": "(407) 867-6954",
                "value": "Orlando Franco | General Manager | Windsor Island Resort | Managed by Castle Group | GeneralManager@windsorislandresorthoa.com | ofranco@castlegroup.com | P: 863-438-5950 or 352-577-8184"
            },
            {
                "label": "",
                "value": "863-353-6311"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Club House",
                "value": "9AM - 8PM daily — Basketball"
            },
            {
                "label": "Water Park",
                "value": "10AM - 6PM — Sand Volleyball"
            },
            {
                "label": "Rumbrella Tiki bar",
                "value": "11AM - 6PM"
            },
            {
                "label": "",
                "value": "Cabanas Rental"
            },
            {
                "label": "Arcade",
                "value": "09AM - 5PM"
            },
            {
                "label": "Fitness Center",
                "value": "9AM - 8PM daily — Aditional info"
            },
            {
                "label": "",
                "value": "ANY suspicious activity or noise complaints"
            },
            {
                "label": "",
                "value": "o contact roving patrol at 347-805-0987"
            },
            {
                "label": "",
                "value": "*non-emergency Polk County Sheriff department at 863-236-3900"
            },
            {
                "label": "POOL",
                "value": "* Guardhouse phone number – 863-353-6470/863-353-6311 | generalmanager@windsorislandresorthoa.com | windsorislandfrontdesk@gmail.com"
            },
            {
                "label": "Pool Guy",
                "value": "Weekday"
            },
            {
                "label": "Sunshine Pools - Renato",
                "value": "Monday, Tuesday, Friday"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Bench for TH & Bin for Homes",
                "value": "Daily - Valet after 07AM — ******If trash is not picked up by 1pm, contact the clubhouse at 863-438-5950"
            },
            {
                "label": "",
                "value": "DUMPSTER - On the left side after main gate"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Townhomes: May park up to 3 cars",
                "value": "Parking Spot: No parking on Grass or Sidewalks"
            },
            {
                "label": "Up to 6 bedroom Homes: May park up to 4 cars",
                "value": "Parking Spot: One Side Street Parking: Vehicles are allowed to park on designated sides of the street, as indicated by street signs."
            },
            {
                "label": "7-10-Bedroom Homes: May park up to 5 cars",
                "value": "Parking Spot: Unauthorized Parking: Cars are subject to towing if parked in unauthorized areas."
            },
            {
                "label": "",
                "value": "The Resort requires the registration of every individual over 18 years old in the vehicle, not just the driver."
            },
            {
                "label": "Commercial, Recreational vehicles, RVs / Trailers or boats are not allowed",
                "value": "3 town house"
            },
            {
                "label": "",
                "value": "Oversized vehicles that do not fit in the driveway must use oversized vehicle parking, which is subject to a $75 per night fee."
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "NO pkg acceped at clubhouse."
            },
            {
                "label": "",
                "value": "Packages from UPS are delivered straight to the house."
            },
            {
                "label": "",
                "value": "USPS are sent back."
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "Yes"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Windsor Cay';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Windsor Cay',
        array['wc', 'windsor cay']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "No Gate"
            },
            {
                "label": "",
                "value": "Gate Support: support@symliv.com"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "1217 Emerald Row Wy, Clermont, FL 34714",
                "value": "(407)-216 -1420 or (407)-259-6211 — Symliv (Gate acess support) — support@symliv.com"
            },
            {
                "label": "Send the guests to the Windsor cay blvd, direct themselves to the gate with a guard and they present their ID to the guard",
                "value": "Katie Tamanini (Clubhouse Manager - Castle Group) — ktamanini@castlegroup.com — 352-432-3022"
            },
            {
                "label": "Charisse Harendza (Community Association Manager, LCAM | Castle Group)",
                "value": "charendza@castlegroup.com"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "",
                "value": "Information in Gate access sheet"
            },
            {
                "label": "The Reef Club | 8:00 AM – 8:00 PM | Blue Lagoon Tavern & Grille | 11:00 AM – 7:00 PM | Pool Deck & Water Amenities | 10:00 AM – 7:00 PM | Mini Golf, Cornhole & Volleyball | 10:00 AM – 7:00 PM",
                "value": "Information in Gate access sheet"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "",
                "value": "Supreme Pools - Breno"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Single family - Trash bin",
                "value": "Days: Daily"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: Townhome = Shared Surface Parking"
            },
            {
                "label": "No commercial or recreational vehicles, No trailers or boat",
                "value": "Parking Spot: Single Family = 2 Vehicles in the garage and 2 in the driveway"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Packages from UPS and Amazon are delivered straight to the house."
            },
            {
                "label": "",
                "value": "USPS are sent back."
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Windsor Hills';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Windsor Hills',
        array['wh', 'windsor hills']::text[],
        '2600 N Old Lake Wilson Rd',
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "Dwellinglive",
                "value": "Login: https://community.dwellinglive.com/"
            },
            {
                "label": "Guest must be registered",
                "value": "Login: https://docs.google.com/spreadsheets/d/15rnSnXSX9jOkxR0Gn9teNs3WUJYIHeWf_RzN1hzDBRg/edit?gid=701856462#gid=701856462"
            },
            {
                "label": "Extra 4th car or oversize",
                "value": "Login: https://www.mygreencondo.net/external_site/public_form/2039/1/H"
            },
            {
                "label": "",
                "value": "Send e-mail to whreception@welcometowindsorhills.com"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "2600 N Old Lake Wilson Rd",
                "value": "Phone number: (407) 787-4255 — Website / E-mail: https://www.welcometowindsorhills.com/guest-resources"
            },
            {
                "label": "",
                "value": "Kissimmee, FL 34747"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Water Slide",
                "value": "Hours: Winter(10-6)Summer(10-8) — Access / Code: Welcome Center - Access Code — Sport Equipment Rental: Billards — Duration: 1 hour — Price: 5.0"
            },
            {
                "label": "Community Pool",
                "value": "Hours: 8AM - 10PM — Access / Code: 45808.0 — Sport Equipment Rental: Ping Pong — Duration: 1 hour — Price: 11.0"
            },
            {
                "label": "Game room",
                "value": "8AM - 10PM — Basketball/VolleyBall — 3 hours — 15.0"
            },
            {
                "label": "Billards",
                "value": "8AM - 10PM — Tennis/Golf — 3 hours — 25.0"
            },
            {
                "label": "Movie Theater",
                "value": "Show times: 10am,1pm, 4pm, 6/7 pm — Pickleball — 3 hours — 25.0"
            },
            {
                "label": "Cyber Cafe",
                "value": "8AM - 10PM"
            },
            {
                "label": "Ping Pong",
                "value": "8AM - 10PM"
            },
            {
                "label": "The marketplace Grill",
                "value": "9AM - 9PM"
            },
            {
                "label": "ATM",
                "value": "8AM - 10PM"
            },
            {
                "label": "Baskeball/Volley Ball",
                "value": "8AM - 10PM"
            },
            {
                "label": "Tennis/Golf",
                "value": "8AM - 10PM"
            },
            {
                "label": "",
                "value": "Gym"
            },
            {
                "label": "Fitness Center",
                "value": "06:30AM - 10PM"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Supreme Pools - Breno",
                "value": "Weekday: Tuesday"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Bench",
                "value": "Days: Daily after 7 am"
            },
            {
                "label": "Dumpsters",
                "value": "Days: Compactors are located at the corner of Comrow St & Almaton Loop,"
            },
            {
                "label": "",
                "value": "next to the playgorund on Dinville St, at the corner of Archfeld & Teascone Blvd (at the hilltop) & also in the recreation area parking lot."
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "3 maximum",
                "value": "Parking Spot: There are overflow parking spots by Comrow Street."
            },
            {
                "label": "",
                "value": "No street parking"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Straight to the house"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "Yes, there is a dog park near tennis court"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Windsor Palms';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Windsor Palms',
        array['windsor palms', 'wp']::text[],
        '2300 Wyndham Palms Way - Kissimmee, FL 34747',
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "Attendant / Gate Access",
                "value": "Login: https://docs.google.com/spreadsheets/d/15rnSnXSX9jOkxR0Gn9teNs3WUJYIHeWf_RzN1hzDBRg/edit?gid=701856462#gid=701856462"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "2300 Wyndham Palms Way - Kissimmee, FL 34747",
                "value": "407-390-1991"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Club House",
                "value": "Hours: 08AM - 10PM — Access / Code: Scheduled times by resort — Court: Sand Volleyball"
            },
            {
                "label": "Cinema",
                "value": "Tennis"
            },
            {
                "label": "Fitness Center",
                "value": "Basketball"
            },
            {
                "label": "",
                "value": "Game room"
            },
            {
                "label": "",
                "value": "Kids play area"
            },
            {
                "label": "",
                "value": "Olympic Pool"
            },
            {
                "label": "",
                "value": "Toddler Pool"
            },
            {
                "label": "",
                "value": "Spa"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Supreme Pools - Breno",
                "value": "Weekday: Wednesday???"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Bench",
                "value": "Days: Daily, no holidays"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: Attendant provides the place and car pass"
            },
            {
                "label": "",
                "value": "* The townhouses 2357 Silver and 2340 Silver can park up to 2 cars. One in the house's space and another on the side of the street. | * The houses 8017 King and 8060 King can park up to 5 cars. You cannot park on the grass or block pedestrians. You cannot park on the street either. These two houses specifically can accommodate up to 3 cars. Two parallel and one perpendicular without obstructing the sidewalk and without being on the street. The other two cars can park in the spaces near the clubhouse."
            },
            {
                "label": "",
                "value": "* The houses 8017 King and 8060 King can park up to 5 cars. You cannot park on the grass or block pedestrians. You cannot park on the street either. These two houses specifically can accommodate up to 3 cars. Two parallel and one perpendicular without obstructing the sidewalk and without being on the street. The other two cars can park in the spaces near the clubhouse."
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Doorstep dropoff / USPS no / UPS yes / FEDEX yes"
            },
            {
                "label": "",
                "value": "Clubhouse address"
            },
            {
                "label": "",
                "value": "Delivery can be to the house or club house"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Windsor at Westside';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Windsor at Westside',
        array['waw', 'windsor at westside']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "70206 (The First gate on the left with no guard)",
                "value": "IMPORTANT INFO: | Phase 3 of the Windsor at Westside: | Guests need to go to the gatehouse, located on Sydney Avenue, | to pick up a proxy card, which will be valid until 10am on the day of check-out. | Phase 3 includes the following streets: | * Sydney Avenue | * Dubai Street | * Tangier Drive | * Zurich Lane | * Prague Way | * Luxor Drive | |"
            },
            {
                "label": "",
                "value": "- 1998 Majorca Drive - 53386"
            },
            {
                "label": "",
                "value": "- 2436 Dubai St - 48685"
            },
            {
                "label": "",
                "value": "- 2476 Dubai St - 47208"
            },
            {
                "label": "",
                "value": "- 2476 Dubai St - 47208"
            },
            {
                "label": "",
                "value": "- 8874 Geneve Ct - 19829"
            },
            {
                "label": "",
                "value": "- 8882 Geneve Court - 67527"
            },
            {
                "label": "",
                "value": "- 8904 Bengal Court - 50622"
            },
            {
                "label": "",
                "value": "- 8923 Sydney Avenue - 76626"
            },
            {
                "label": "",
                "value": "- 8924 Sydney Avenue - 65517"
            },
            {
                "label": "",
                "value": "- 8909 Bengal Ct- 51673"
            },
            {
                "label": "",
                "value": "- 8907 Sydney Ave - 11768"
            },
            {
                "label": "",
                "value": "- 8936 Adriatico Lane - 59498"
            },
            {
                "label": "",
                "value": "- 8917 Sydney Avenue - 70206"
            },
            {
                "label": "",
                "value": "- 8928 Sydney Avenue - 79960"
            },
            {
                "label": "",
                "value": "- 8815 Geneve Court -"
            },
            {
                "label": "",
                "value": "- 2424 Tangier Dr -70802"
            },
            {
                "label": "",
                "value": "- 2414 Tangier Dr - 70802"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "2100 Tripoli Court Kissimmee, FL 34747 and 2301 Luxor Drive Kissimmee, FL 34747",
                "value": "Phone number: # | 407-507-9077 — Website / E-mail: | hmontiel@castlegroup.com | asantana@castlegroup.com"
            },
            {
                "label": "Magic Towing (Association towing vendor) |",
                "value": "Phone number: 407-847-5333 — Website / E-mail: magictows@yahoo.com"
            },
            {
                "label": "Guardhouse number and clubhouse number:",
                "value": "407-507-1417"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Club house",
                "value": "9am – 9pm every day"
            },
            {
                "label": "Market/Bar",
                "value": "11AM - 8:45PM | — Basketball"
            },
            {
                "label": "Fitness Center",
                "value": "24h — They verify address / code 1234*"
            },
            {
                "label": "Pool Area",
                "value": "No Key"
            },
            {
                "label": "",
                "value": "Free Arcade"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "High tech pools - Erik",
                "value": "Weekday: Tuesday, Wednesday and Friday???"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Bench",
                "value": "Days: Daily, no holidays"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Car Limit:",
                "value": "Parking Spot: All town homes : Maximum of 3 Vehicles"
            },
            {
                "label": "",
                "value": "4-5 Bedroom single Family Homes : Maximum of 3 vehicles |"
            },
            {
                "label": "",
                "value": "6-7 Bedroom Single Family Homes: Maximum of 4 Vehicles |"
            },
            {
                "label": "",
                "value": "8-9 Bedroom Single Family Homes : Maximum of 5 vehicles |"
            },
            {
                "label": "Important :",
                "value": "Parking Spot: | Vehicles exceeding the limit will not be permitted entry and must arrange for offsite parking. | If you or your guest is requesting and exception to the parking limit, | please email us within one week prior to the guest check- in date with the following : | - Number of vehicles requesting entry. | - Reason for the additional vehicles | hmontiel@castlegroup.com | asantana@castlegroup.com"
            },
            {
                "label": "Overflow parking:",
                "value": "Parking Spot: Around the lakes behind the Clubhouse. In front of the club house is not allowed"
            },
            {
                "label": "Street parking:",
                "value": "Parking Spot: Allowed. Not on grass and not blocking sidewalks"
            },
            {
                "label": "Commercial vehicles: |",
                "value": "Parking Spot: No"
            },
            {
                "label": "Recreational vehicles and trailers allowed: |",
                "value": "Parking Spot: No"
            },
            {
                "label": "Size of vans are permitted: |",
                "value": "Parking Spot: Up to 15 passenger vans"
            },
            {
                "label": "Magic Towing (Association towing vendor)",
                "value": "Parking Spot: 407-847-5333 / magictows@yahoo.com"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "NO pkg acceped at clubhouse. | Packages from UPS/FEDEX are delivered straight to the house. USPS are sent back."
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "Yes, allowed only in comunity with a leash. Not allowed in club house area."
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Bridgewater Crossings';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Bridgewater Crossings',
        array['bc', 'bridgewater crossings', 'out of area']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "No gate",
                "value": "Login: It is an open community"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "",
                "value": "No amenities"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "William",
                "value": "Weekday: Tuesday"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "",
                "value": "Recycle - Mondays"
            },
            {
                "label": "",
                "value": "Trash - Tuesday"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: Driveway and own parking"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Straight to the house"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "Yes"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Chatham';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Chatham',
        array['chatham', 'out of area']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "No Gate",
                "value": "Login: It is an open community"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "",
                "value": "No amenities"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "",
                "value": "Rodrigo"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Trash bin beside the house",
                "value": "Days: Blue bin Wednesday morning"
            },
            {
                "label": "",
                "value": "Brown bin Tuesday morning"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: Driveway"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Country Creek Lakes';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Country Creek Lakes',
        array['ccl', 'country creek lakes', 'out of area']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "No Gate",
                "value": "Login: It is an open community"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "",
                "value": "No amenities"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "",
                "value": "Rodrigo"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "Shuttle"
            },
            {
                "label": "",
                "value": "To Parks?"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Indian Ridge';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Indian Ridge',
        array['indian ridge', 'ir', 'out of area']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "No gate"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "William",
                "value": "Weekday: Monday"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Trah bin beside the house",
                "value": "Days: Recycle - Wednesday"
            },
            {
                "label": "",
                "value": "Trash - Thursday"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: 2 spots in front of the house"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Serenity';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Serenity',
        array['serenity', 'out of area']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "No Gate"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "",
                "value": "17400 Placidity Ave"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Playground",
                "value": "Hours: 6AM - 10PM — Access / Code: Key Fob — Court: Tennis"
            },
            {
                "label": "",
                "value": "Fitness Center"
            },
            {
                "label": "",
                "value": "Swimming Pool"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "Renato",
                "value": "Weekday: Thursday"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Valet",
                "value": "Days: Tuesday"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: 1 Car Assigned Spot + Other Unmarked Spots."
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Straight to the House / Amazon and UPS"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'Tuscan Hills';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'Tuscan Hills',
        array['th', 'tuscan hills', 'out of area']::text[],
        null,
        '62509#',
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "62509# until June 1st"
            },
            {
                "label": "",
                "value": "June 1st-June 30th: 02253#"
            },
            {
                "label": "",
                "value": "June 30th - July 29th: 73021#"
            },
            {
                "label": "",
                "value": "June 30th - July 29th: 73021#"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "",
                "value": "200 Tuscan Hills Blvd Davenport FL 33897"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "",
                "value": "Renato"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "GARBAGE IS MONDAY ONLY (GRAY BIN) | RECYCLING IS FRIDAY ONLY (YELLOW TOP BIN)",
                "value": "Days: Monday/Friday"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "",
                "value": "Only 2 in the driveway , no company trucks"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            },
            {
                "label": "",
                "value": "Shuttle"
            },
            {
                "label": "",
                "value": "To Parks?"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );

    delete from public.resorts where name = 'West Haven';
    insert into public.resorts (name, aliases, address, gate_code, sections, updated_by) values (
        'West Haven',
        array['west haven', 'wh', 'out of area']::text[],
        null,
        null,
        $json$[
    {
        "type": "gate",
        "title": "Gate Access",
        "items": [
            {
                "label": "",
                "value": "No Gate"
            }
        ]
    },
    {
        "type": "contacts",
        "title": "Contacts",
        "items": [
            {
                "label": "",
                "value": "17400 Placidity Ave"
            }
        ]
    },
    {
        "type": "amenities",
        "title": "Community Amenities",
        "items": [
            {
                "label": "Playground",
                "value": "Hours: 6AM - 10PM — Access / Code: Key Fob — Court: Tennis"
            },
            {
                "label": "",
                "value": "Fitness Center"
            },
            {
                "label": "",
                "value": "Swimming Pool"
            }
        ]
    },
    {
        "type": "pool",
        "title": "Pool",
        "items": [
            {
                "label": "",
                "value": "Thursday"
            }
        ]
    },
    {
        "type": "trash",
        "title": "Trash",
        "items": [
            {
                "label": "Valet",
                "value": "Days: Tuesday"
            }
        ]
    },
    {
        "type": "parking",
        "title": "Parking",
        "items": [
            {
                "label": "Yes",
                "value": "Parking Spot: 1 Car Assigned Spot + others spots unmarked"
            }
        ]
    },
    {
        "type": "packages",
        "title": "Packages",
        "items": [
            {
                "label": "",
                "value": "Mail/Packages"
            },
            {
                "label": "",
                "value": "Straight to the House / Amazon and UPS"
            }
        ]
    },
    {
        "type": "pets",
        "title": "Pets",
        "items": [
            {
                "label": "",
                "value": "Pet Friendly"
            },
            {
                "label": "",
                "value": "No"
            }
        ]
    },
    {
        "type": "ev",
        "title": "Electric Car",
        "items": [
            {
                "label": "",
                "value": "No"
            }
        ]
    }
]$json$::jsonb,
        'seed-xlsx'
    );
end $$;
