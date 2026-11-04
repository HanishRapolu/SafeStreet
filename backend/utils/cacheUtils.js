const { clearCachePattern } = require('../utils/redisClient');

const isRedisEnabled = () => process.env.REDIS_ENABLED === 'true';

const clearDamageReportCaches = async (tenantId) => {
  if (!isRedisEnabled()) {
    return true;
  }
  try {
    // Clear all damage report related caches for the tenant
    if (tenantId) {
      // Clear tenant-specific caches
      await clearCachePattern(`tenant:${tenantId}:cache:*damage*`);
      await clearCachePattern(`tenant:${tenantId}:cache:*report*`);
    } else {
      // Clear all damage caches if no tenant specified
      await clearCachePattern(`*damage*`);
      await clearCachePattern(`*report*`);
    }
    return true;
  } catch (error) {
    console.error('Failed to clear damage report caches:', error);
    return false;
  }
};

const clearSingleReportCache = async (reportId, tenantId) => {
  if (!isRedisEnabled()) {
    return true;
  }
  try {
    // Clear cache for specific report
    if (tenantId) {
      await clearCachePattern(`tenant:${tenantId}:cache:*report/${reportId}*`);
    } else {
      await clearCachePattern(`*report/${reportId}*`);
    }
    return true;
  } catch (error) {
    console.error(`Failed to clear cache for report ${reportId}:`, error);
    return false;
  }
};

module.exports = {
  clearDamageReportCaches,
  clearSingleReportCache
};
