import { supabase } from "./supabase.js";

// Shared module for section type definitions. Replaces the hardcoded
// SECTION_TYPES arrays previously duplicated across dashboard.js,
// extension/popup.js, and scripts/build_seed.py.
//
// Section types are fetched once from Supabase on init, cached in memory,
// and accessed synchronously via the getters below.

let _types = null;
let _byType = null;
let _loadPromise = null;

async function fetchTypes() {
    const { data, error } = await supabase
        .from("section_types")
        .select("*")
        .order("sort_order");
    if (error) {
        console.error("Failed to load section types:", error);
        return [];
    }
    return data || [];
}

export async function loadSectionTypes() {
    if (_types) return _types;
    if (_loadPromise) return _loadPromise;

    _loadPromise = fetchTypes().then(data => {
        _types = data;
        _byType = new Map(data.map(t => [t.type, t]));
        _loadPromise = null;
        return _types;
    });

    return _loadPromise;
}

export function getSectionTypes() {
    return _types || [];
}

export function getSectionType(type) {
    return _byType ? _byType.get(type) || null : null;
}

export function getSectionIcon(type) {
    const t = getSectionType(type);
    return t ? t.icon : "\u270F\uFE0F";
}

export function getSectionTitle(type, fallback = "Custom") {
    const t = getSectionType(type);
    return t ? t.title : fallback;
}

