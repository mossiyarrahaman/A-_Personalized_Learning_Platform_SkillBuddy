const TIER_BLOOM_MAP = {
    beginner:     ['remember', 'understand'],
    intermediate: ['apply', 'analyze'],
    advanced:     ['evaluate', 'create'],
};

const TIERS = ['beginner', 'intermediate', 'advanced'];

const TIER_DEFAULT_BLOOM = {
    beginner:     'remember',
    intermediate: 'apply',
    advanced:     'evaluate',
};

function bloomToTier(bloomLevel) {
    for (const [tier, levels] of Object.entries(TIER_BLOOM_MAP)) {
        if (levels.includes(bloomLevel)) return tier;
    }
    return null;
}

function isValidTier(tier) {
    return TIERS.includes(tier);
}

module.exports = { TIER_BLOOM_MAP, TIERS, TIER_DEFAULT_BLOOM, bloomToTier, isValidTier };
