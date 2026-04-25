import type { UserModel, ContainerModel, ProductModel, FriendModel, TokenModel } from './views/types/models.ts'

const KEYS = {
    USER: 'user',
    CONTAINERS: 'containers',
    FRIENDS: 'friends',
    TOKENS: 'tokens',
} as const;

// ─── USER ────────────────────────────────────────────────────────────────────

export const saveUser = (user: UserModel): void => {
    if (!user) return;
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
};

export const getUser = (): UserModel | null => {
    const stored = localStorage.getItem(KEYS.USER);
    if (!stored || stored === 'undefined' || stored === 'null') return null;
    try {
        return JSON.parse(stored);
    } catch {
        return null;
    }
};

export const removeUser = (): void => {
    localStorage.removeItem(KEYS.USER);
    localStorage.removeItem(KEYS.CONTAINERS);
    localStorage.removeItem(KEYS.FRIENDS);
    localStorage.removeItem(KEYS.TOKENS);
};

// ─── CONTAINERS ──────────────────────────────────────────────────────────────

export const saveContainers = (containers: ContainerModel[]): void => {
    if (!containers || !Array.isArray(containers)) return;
    localStorage.setItem(KEYS.CONTAINERS, JSON.stringify(containers));
};

export const getStoredContainers = (): ContainerModel[] => {
    const stored = localStorage.getItem(KEYS.CONTAINERS);
    if (!stored || stored === 'undefined' || stored === 'null') return [];
    try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

export const getStoredProductsByContainerId = (containerId: string): ProductModel[] => {
    const containers = getStoredContainers();
    const container = containers.find(c => c.id === containerId);
    if (!container) return [];
    // filtrujemy po containerId na wypadek gdyby produkty miały to pole
    return (container.productList || []).filter(
        p => !p.containerId || p.containerId === containerId
    );
};

/** Dodaje produkt do productList wybranego kontenera i zapisuje całość. */
export const addProductToContainer = (containerId: string, product: ProductModel): void => {
    const containers = getStoredContainers();
    const updated = containers.map(c => {
        if (c.id !== containerId) return c;
        return { ...c, productList: [...(c.productList || []), product] };
    });
    saveContainers(updated);
};

/** Aktualizuje istniejący produkt (po product.id) w danym kontenerze. */
export const updateProductInContainer = (containerId: string, updatedProduct: ProductModel): void => {
    const containers = getStoredContainers();
    const updated = containers.map(c => {
        if (c.id !== containerId) return c;
        const newList = (c.productList || []).map(p =>
            p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p
        );
        return { ...c, productList: newList };
    });
    saveContainers(updated);
};

/** Usuwa produkt po id z danego kontenera. */
export const removeProductFromContainer = (containerId: string, productId: string): void => {
    const containers = getStoredContainers();
    const updated = containers.map(c => {
        if (c.id !== containerId) return c;
        return { ...c, productList: (c.productList || []).filter(p => p.id !== productId) };
    });
    saveContainers(updated);
};

// ─── FRIENDS ─────────────────────────────────────────────────────────────────

export const saveFriends = (friends: FriendModel[]): void => {
    if (!friends || !Array.isArray(friends)) return;
    localStorage.setItem(KEYS.FRIENDS, JSON.stringify(friends));
};

export const getStoredFriends = (): FriendModel[] => {
    const stored = localStorage.getItem(KEYS.FRIENDS);
    if (!stored || stored === 'undefined' || stored === 'null') return [];
    try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

// ─── TOKENS ──────────────────────────────────────────────────────────────────

export const saveTokens = (tokens: TokenModel): void => {
    if (!tokens) return;
    localStorage.setItem(KEYS.TOKENS, JSON.stringify(tokens));
};

export const getTokens = (): TokenModel | null => {
    const stored = localStorage.getItem(KEYS.TOKENS);
    if (!stored || stored === 'undefined' || stored === 'null') return null;
    try {
        return JSON.parse(stored);
    } catch {
        return null;
    }
};

export const removeTokens = (): void => {
    localStorage.removeItem(KEYS.TOKENS);
};