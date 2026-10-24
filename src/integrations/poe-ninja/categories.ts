export const itemCategories = {
    '1': {
        UniqueAccessory: 'unique-accessories',
        UniqueWeapon: 'unique-weapons',
        UniqueArmour: 'unique-armours',
        UniqueFlask: 'unique-flasks',
        UniqueJewel: 'unique-jewels',
        UniqueTincture: 'unique-tinctures',
        UniqueRelic: 'unique-relics',
        SkillGem: 'skill-gems',
        BaseType: 'base-types',
        ClusterJewel: 'cluster-jewels',
        UniqueMap: 'unique-maps',
        BlightedMap: 'blighted-maps',
        BlightRavagedMap: 'blight-ravaged-maps',
        ForbiddenJewel: 'forbidden-jewels',
        ShrineBelt: 'shrine-belts',
        Wombgift: 'wombgifts',
        Corpse: 'corpses',
        Invitation: 'invitations',
        Beast: 'beasts',
        Vial: 'vials',
    },
    '2': {
        UniqueAccessories: 'unique-accessories',
        UniqueWeapons: 'unique-weapons',
        UniqueArmours: 'unique-armours',
        UniqueFlasks: 'unique-flasks',
        UniqueJewels: 'unique-jewels',
        UniqueCharms: 'unique-charms',
        UniqueSanctumRelics: 'unique-relics',
        UniqueTablets: 'unique-tablets',
        PrecursorTablets: 'precursor-tablets',
    },
} as const

// Legacy category retained for a possible return; not requested by default.
export const disabledItemCategories = { '1': { ImbuedGem: 'imbued-gems' } } as const
