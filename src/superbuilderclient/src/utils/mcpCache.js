import { Store } from '@tauri-apps/plugin-store';

// Cache configuration
const CACHE_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 1 day (24 hours)
const STORE_PATH = 'mcp-marketplace-cache.json';

// Initialize the store (singleton pattern)
let storeInstance = null;

async function getStore() {
  if (!storeInstance) {
    storeInstance = await Store.load(STORE_PATH);
  }
  return storeInstance;
}

/**
 * Save marketplace data to cache
 */
export async function saveMarketplaceCache(data) {
  try {
    const store = await getStore();
    const cacheData = {
      marketplaceServers: data.marketplaceServers || [],
      marketplaceLastFetch: Date.now(),
      version: '1.0', // For future cache format changes
    };
    
    await store.set('marketplaceData', cacheData);
    await store.save();
    
    console.log('Marketplace cache saved:', {
      servers: cacheData.marketplaceServers.length,
      timestamp: new Date(cacheData.marketplaceLastFetch).toLocaleTimeString()
    });
    
    return true;
  } catch (error) {
    console.error('Failed to save marketplace cache:', error);
    return false;
  }
}

/**
 * Load marketplace data from cache
 * Returns null if cache is invalid or expired
 */
export async function loadMarketplaceCache() {
  try {
    const store = await getStore();
    const cacheData = await store.get('marketplaceData');
    
    if (!cacheData) {
      console.log('No marketplace cache found');
      return null;
    }
    
    // Check cache version
    if (cacheData.version !== '1.0') {
      console.log('Cache version mismatch, invalidating');
      return null;
    }
    
    // Check if cache is expired
    const now = Date.now();
    const cacheAge = now - (cacheData.marketplaceLastFetch || 0);
    
    if (cacheAge > CACHE_TIMEOUT_MS) {
      console.log('Marketplace cache expired:', {
        age: Math.round(cacheAge / 1000 / 60) + ' minutes',
        maxAge: Math.round(CACHE_TIMEOUT_MS / 1000 / 60) + ' minutes'
      });
      return null;
    }
    
    console.log('Marketplace cache loaded:', {
      servers: cacheData.marketplaceServers?.length || 0,
      age: Math.round(cacheAge / 1000) + ' seconds',
      timestamp: new Date(cacheData.marketplaceLastFetch).toLocaleTimeString()
    });
    
    return cacheData;
  } catch (error) {
    console.error('Failed to load marketplace cache:', error);
    return null;
  }
}

/**
 * Save local MCP servers to cache
 */
export async function saveLocalServersCache(mcpServers) {
  try {
    const store = await getStore();
    const cacheData = {
      mcpServers: mcpServers || [],
      lastFetch: Date.now(),
      version: '1.0',
    };
    
    await store.set('localServersData', cacheData);
    await store.save();
    
    console.log('Local servers cache saved:', {
      servers: cacheData.mcpServers.length,
      timestamp: new Date(cacheData.lastFetch).toLocaleTimeString()
    });
    
    return true;
  } catch (error) {
    console.error('Failed to save local servers cache:', error);
    return false;
  }
}

/**
 * Load local MCP servers from cache
 */
export async function loadLocalServersCache() {
  try {
    const store = await getStore();
    const cacheData = await store.get('localServersData');
    
    if (!cacheData) {
      console.log('No local servers cache found');
      return null;
    }
    
    // Check cache version
    if (cacheData.version !== '1.0') {
      console.log('Cache version mismatch, invalidating');
      return null;
    }
    
    console.log('Local servers cache loaded:', {
      servers: cacheData.mcpServers?.length || 0,
      timestamp: new Date(cacheData.lastFetch).toLocaleTimeString()
    });
    
    return cacheData;
  } catch (error) {
    console.error('Failed to load local servers cache:', error);
    return null;
  }
}

/**
 * Save marketplace servers by ID cache (detailed server configs)
 */
export async function saveMarketplaceServersByIdCache(marketplaceServersById) {
  try {
    const store = await getStore();
    const cacheData = {
      marketplaceServersById: marketplaceServersById || {},
      lastFetch: Date.now(),
      version: '1.0',
    };
    
    await store.set('marketplaceServersByIdData', cacheData);
    await store.save();
    
    console.log('Marketplace servers by ID cache saved:', {
      count: Object.keys(cacheData.marketplaceServersById).length,
      timestamp: new Date(cacheData.lastFetch).toLocaleTimeString()
    });
    
    return true;
  } catch (error) {
    console.error('Failed to save marketplace servers by ID cache:', error);
    return false;
  }
}

/**
 * Load marketplace servers by ID from cache
 */
export async function loadMarketplaceServersByIdCache() {
  try {
    const store = await getStore();
    const cacheData = await store.get('marketplaceServersByIdData');
    
    if (!cacheData) {
      console.log('No marketplace servers by ID cache found');
      return null;
    }
    
    // Check cache version
    if (cacheData.version !== '1.0') {
      console.log('Cache version mismatch, invalidating');
      return null;
    }
    
    console.log('Marketplace servers by ID cache loaded:', {
      count: Object.keys(cacheData.marketplaceServersById || {}).length,
      timestamp: new Date(cacheData.lastFetch).toLocaleTimeString()
    });
    
    return cacheData;
  } catch (error) {
    console.error('Failed to load marketplace servers by ID cache:', error);
    return null;
  }
}

/**
 * Clear all marketplace-related cache
 */
export async function clearMarketplaceCache() {
  try {
    const store = await getStore();
    await store.delete('marketplaceData');
    await store.delete('localServersData');
    await store.delete('marketplaceServersByIdData');
    await store.save();
    
    console.log('Marketplace cache cleared');
    return true;
  } catch (error) {
    console.error('Failed to clear marketplace cache:', error);
    return false;
  }
}

/**
 * Get cache statistics for debugging
 */
export async function getCacheStats() {
  try {
    const store = await getStore();
    const marketplaceData = await store.get('marketplaceData');
    const localServersData = await store.get('localServersData');
    const marketplaceServersByIdData = await store.get('marketplaceServersByIdData');
    
    return {
      marketplace: {
        exists: !!marketplaceData,
        servers: marketplaceData?.marketplaceServers?.length || 0,
        lastFetch: marketplaceData?.marketplaceLastFetch 
          ? new Date(marketplaceData.marketplaceLastFetch).toLocaleString() 
          : 'Never',
        age: marketplaceData?.marketplaceLastFetch 
          ? Math.round((Date.now() - marketplaceData.marketplaceLastFetch) / 1000) + 's'
          : 'N/A',
      },
      localServers: {
        exists: !!localServersData,
        servers: localServersData?.mcpServers?.length || 0,
        lastFetch: localServersData?.lastFetch 
          ? new Date(localServersData.lastFetch).toLocaleString() 
          : 'Never',
      },
      serversById: {
        exists: !!marketplaceServersByIdData,
        count: Object.keys(marketplaceServersByIdData?.marketplaceServersById || {}).length,
        lastFetch: marketplaceServersByIdData?.lastFetch 
          ? new Date(marketplaceServersByIdData.lastFetch).toLocaleString() 
          : 'Never',
      },
    };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return null;
  }
}
