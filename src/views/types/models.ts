// TODO
// zastanowic sie gdzie to dac czy po prostu tak juz zostawic

export interface ProductModel {
    id?: string;
    containerId?: string;
    productName?: string;
    description?: string;
    quantity?: number;
    unit?: string;
    capacity?: number;
    imageUrl?: string | null;
    tags?: string[];
    expirationDate?: string;
    addedDate?: string;
}

// Wpis użytkownika w kontenerze — przechowuje userId i rolę
export interface ContainerUserEntry {
    userId: string;
    role: Role;
}

export interface ContainerModel {
    id?: string;
    containerName?: string;
    ownerId?: string;
    description?: string;
    imageUrl?: string | null;
    productList?: ProductModel[];
    isForMoreUsers?: boolean;
    // userList teraz trzyma obiekty { userId, role } zamiast surowych stringów
    userList?: ContainerUserEntry[] | null;
    tags?: string[] | null;
    containerStripColor?: { name: string };
}

export interface UserModel {
    id?: string;
    login?: string;
    email?: string;
    phoneNumber?: string;
    firstName?: string;
    lastName?: string;
    profileUrl?: string | null;
    friends?: string[];
}

export interface FriendModel {
    id: string;
    login: string;
    email: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
    profileUrl: string | null;
    createdAt: string;
}

export interface GroupMember {
    friend: FriendModel;
    role: Role;
}

export interface TokenModel {
    accessToken: string;
    refreshToken: string;
}

// image_url używa innej konwencji nazewnictwa niż w modelu ProductModel, ponieważ
// jest przystosowany do odpowiedzi z API openFoodFacts.
export interface BarcodeProductInfo {
    code: string;
    product?: {
        name?: string;
        brand?: string;
        image_url?: string;
        capacity?: number;
        unit?: string;
    };
    status: number;
}

export interface NotificationModel {
    id: string;
    userId: string;
    /**
     * 0 - zaproszenie do znajomych     → content: userId zapraszającego
     * 1 - zaproszenie do kontenera     → content: containerId, role: rola przypisana użytkownikowi
     * 2 - produkt przeterminowany      → content: opis produktu, kontenera i daty ważności
     * 3 - produkt zbliża się do końca  → content: opis produktu, kontenera i daty ważności
     */
    type: 0 | 1 | 2 | 3;
    content: string;
    information?: string;
    role?: AnyRole;
    date: string;
}

export const ROLES = ['Admin', 'Editor', 'Viewer'] as const;
export type Role = (typeof ROLES)[number];

// Wszystkie możliwe role włącznie z owner (owner nie jest wybieralny przez UI)
export type AnyRole = 'Owner' | Role;

/**
 * Zwraca rolę bieżącego użytkownika w danym kontenerze.
 * Jeśli użytkownik jest ownerem, zwraca 'owner'.
 * Jeśli jest na liście userList, zwraca jego rolę.
 * W przeciwnym razie zwraca null.
 */
export const getUserRole = (
    container: ContainerModel,
    userId: string
): AnyRole | null => {
    if (container.ownerId === userId) return 'Owner';
    const entry = container.userList?.find(u => u.userId === userId);
    return entry ? entry.role : null;
};

/**
 * Sprawdza, czy użytkownik ma uprawnienia do danej akcji.
 * owner > admin > editor > viewer
 */
export const canPerformAction = (
    role: AnyRole | null,
    requiredRole: AnyRole
): boolean => {
    const hierarchy: AnyRole[] = ['Viewer', 'Editor', 'Admin', 'Owner'];
    const userIndex = role ? hierarchy.indexOf(role) : -1;
    const requiredIndex = hierarchy.indexOf(requiredRole);
    return userIndex >= requiredIndex;
};