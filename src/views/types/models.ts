// TODO
// zastanowic sie gdzie to dac czy po porsotu tak juz zostawic

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

export interface ContainerModel {
    id?: string;
    containerName?: string;
    ownerId?: string;
    description?: string;
    productList?: ProductModel[];
    isForMoreUsers?: boolean;
    userList?: string[] | null;
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
    friends?: any[];
}

export interface FriendModel {
    id: string;
    login: string;
    email: string;
    firstName: string;
    lastName: string;
}

export interface GroupMember {
    friend: FriendModel;
    role: Role;
}

export interface TokenModel {
    accessToken: string;
    refreshToken: string;
}

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

export const ROLES = ['admin', 'editor', 'viewer'] as const;
export type Role = (typeof ROLES)[number];