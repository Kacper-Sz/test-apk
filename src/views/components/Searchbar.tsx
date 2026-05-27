import type React from "react";
import { useState } from "react";
import { Container, Dropdown, Form, InputGroup, Collapse } from "react-bootstrap";
import { ArrowDownUp, Funnel, Search, XLg } from "react-bootstrap-icons";

// ─── Typy filtrów ──────────────────────────────────────────────────────────

export type ExpirationFilter = 'all' | 'has_date' | 'no_date' | 'expired' | 'expiring_soon' | 'ok';
export type SharingFilter = 'all' | 'shared' | 'private';
export type RoleFilter = 'all' | 'Owner' | 'Admin' | 'Editor' | 'Viewer';

export interface ContainerFilters {
    sharing: SharingFilter;
    role: RoleFilter;
    stripColor: string | null;  // np. 'Red', 'Blue' lub null = brak filtru
}

export interface ProductFilters {
    expiration: ExpirationFilter;
    tags: string[];             // filtruj po tagach (AND — produkt musi mieć wszystkie)
}

export type ActiveFilters = ContainerFilters | ProductFilters;

// ─── Props ─────────────────────────────────────────────────────────────────

type BaseProps = {
    placeholderText: string;
    searchTerm: string;
    setSearchTerm: (v: string) => void;
    sortOrder: 'none' | 'asc' | 'desc';
    setSortOrder: (v: 'none' | 'asc' | 'desc') => void;
};

type ContainerSearchBarProps = BaseProps & {
    mode: 'containers';
    filters: ContainerFilters;
    setFilters: (f: ContainerFilters) => void;
    availableColors?: string[];   // kolory paska dostępne w bieżącym zbiorze
};

type ProductSearchBarProps = BaseProps & {
    mode: 'products';
    filters: ProductFilters;
    setFilters: (f: ProductFilters) => void;
};

type SearchBarProps = ContainerSearchBarProps | ProductSearchBarProps;

// ─── Stałe ────────────────────────────────────────────────────────────────

const STRIP_COLOR_LABELS: Record<string, string> = {
    Red: 'Czerwony',
    Blue: 'Niebieski',
    Green: 'Zielony',
    Yellow: 'Żółty',
    Orange: 'Pomarańczowy',
    Purple: 'Fioletowy',
    White: 'Biały',
    Gray: 'Szary',
};

const STRIP_COLOR_HEX: Record<string, string> = {
    Red: '#e74c3c',
    Blue: '#3498db',
    Green: '#2ecc71',
    Yellow: '#f1c40f',
    Orange: '#e67e22',
    Purple: '#9b59b6',
    White: '#cccccc',
    Gray: '#95a5a6',
};

const EXPIRATION_LABELS: Record<ExpirationFilter, string> = {
    all: 'Wszystkie',
    has_date: 'Z datą ważności',
    no_date: 'Bez daty',
    expired: 'Przeterminowane',
    expiring_soon: 'Wkrótce wygasną',
    ok: 'OK',
};

const ROLE_LABELS: Record<RoleFilter, string> = {
    all: 'Wszystkie role',
    Owner: 'Właściciel',
    Admin: 'Admin',
    Editor: 'Edytor',
    Viewer: 'Obserwator',
};

// ─── Pomocnik: liczba aktywnych filtrów ────────────────────────────────────

const countContainerFilters = (f: ContainerFilters): number =>
    (f.sharing !== 'all' ? 1 : 0) +
    (f.role !== 'all' ? 1 : 0) +
    (f.stripColor !== null ? 1 : 0);

const countProductFilters = (f: ProductFilters): number =>
    (f.expiration !== 'all' ? 1 : 0);

// ─── Komponenty paneli filtrów ─────────────────────────────────────────────

const ContainerFilterPanel: React.FC<{
    filters: ContainerFilters;
    setFilters: (f: ContainerFilters) => void;
    availableColors: string[];
}> = ({ filters, setFilters, availableColors }) => {
    const set = (patch: Partial<ContainerFilters>) =>
        setFilters({ ...filters, ...patch });

    return (
        <div className="d-flex flex-column gap-3">

            {/* Dostępność */}
            <div>
                <div className="text-muted mb-1" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Dostępność
                </div>
                <div className="d-flex flex-wrap gap-2">
                    {(['all', 'private', 'shared'] as SharingFilter[]).map(v => (
                        <button
                            key={v}
                            className={`btn btn-sm ${filters.sharing === v ? 'btn-secondary' : 'btn-outline-secondary'}`}
                            onClick={() => set({ sharing: v })}
                        >
                            {v === 'all' ? 'Wszystkie' : v === 'private' ? 'Tylko moje' : 'Współdzielone'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Rola */}
            <div>
                <div className="text-muted mb-1" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Moja rola
                </div>
                <div className="d-flex flex-wrap gap-2">
                    {(['all', 'Owner', 'Admin', 'Editor', 'Viewer'] as RoleFilter[]).map(v => (
                        <button
                            key={v}
                            className={`btn btn-sm ${filters.role === v ? 'btn-secondary' : 'btn-outline-secondary'}`}
                            onClick={() => set({ role: v })}
                        >
                            {ROLE_LABELS[v]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Kolor paska */}
            {availableColors.length > 0 && (
                <div>
                    <div className="text-muted mb-1" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Kolor paska
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                        <button
                            className={`btn btn-sm ${filters.stripColor === null ? 'btn-secondary' : 'btn-outline-secondary'}`}
                            onClick={() => set({ stripColor: null })}
                        >
                            Wszystkie
                        </button>
                        {availableColors.map(color => (
                            <button
                                key={color}
                                className={`btn btn-sm d-flex align-items-center gap-1 ${filters.stripColor === color ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                onClick={() => set({ stripColor: filters.stripColor === color ? null : color })}
                            >
                                <span
                                    style={{
                                        display: 'inline-block',
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        background: STRIP_COLOR_HEX[color] ?? color,
                                        border: '1px solid rgba(0,0,0,0.15)',
                                    }}
                                />
                                {STRIP_COLOR_LABELS[color] ?? color}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const ProductFilterPanel: React.FC<{
    filters: ProductFilters;
    setFilters: (f: ProductFilters) => void;
}> = ({ filters, setFilters }) => {
    const set = (patch: Partial<ProductFilters>) =>
        setFilters({ ...filters, ...patch });

    const expirationVariant = (v: ExpirationFilter, active: boolean) => {
        if (v === 'expired') return active ? 'btn-danger' : 'btn-outline-danger';
        if (v === 'expiring_soon') return active ? 'btn-warning' : 'btn-outline-warning';
        if (v === 'no_date') return active ? 'btn-dark' : 'btn-outline-dark';
        if (v === 'has_date') return active ? 'btn-info' : 'btn-outline-info';
        return active ? 'btn-secondary' : 'btn-outline-secondary';
    };

    return (
        <div className="d-flex flex-column gap-3">

            {/* Data ważności */}
            <div>
                <div className="text-muted mb-1" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Data ważności
                </div>
                <div className="d-flex flex-wrap gap-2">
                    {(['all', 'has_date', 'no_date', 'expired', 'expiring_soon', 'ok'] as ExpirationFilter[]).map(v => (
                        <button
                            key={v}
                            className={`btn btn-sm ${expirationVariant(v, filters.expiration === v)}`}
                            onClick={() => set({ expiration: v })}
                        >
                            {EXPIRATION_LABELS[v]}
                        </button>
                    ))}
                </div>
            </div>

            {/* No tags UI for product filters (only expiration) */}
        </div>
    );
};

// ─── Główny komponent ──────────────────────────────────────────────────────

const SearchBar: React.FC<SearchBarProps> = (props) => {
    const { placeholderText, searchTerm, setSearchTerm, sortOrder, setSortOrder } = props;
    const [filterOpen, setFilterOpen] = useState(false);

    const activeCount = props.mode === 'containers'
        ? countContainerFilters(props.filters)
        : countProductFilters(props.filters);

    const resetFilters = () => {
        if (props.mode === 'containers') {
            props.setFilters({ sharing: 'all', role: 'all', stripColor: null });
        } else {
            props.setFilters({ expiration: 'all', tags: [] });
        }
    };

    return (
        <div
            className="bg-light sticky-top border-bottom shadow-sm"
            style={{ zIndex: 1019, top: '3rem' }}
        >
            <Container>
                <div className="py-2">
                    {/* Wiersz wyszukiwarki */}
                    <div className="d-flex align-items-center gap-2">
                        <InputGroup className="flex-grow-1 input-group-password-focus">
                            <InputGroup.Text>
                                <Search />
                            </InputGroup.Text>
                            <Form.Control
                                className="bg-light shadow-none"
                                type="text"
                                placeholder={placeholderText}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </InputGroup>

                        {/* Przycisk filtrów */}
                        <button
                            className={`btn position-relative ${filterOpen || activeCount > 0 ? 'btn-secondary' : 'btn-outline-secondary'}`}
                            title="Filtruj"
                            onClick={() => setFilterOpen(v => !v)}
                        >
                            <Funnel size={18} />
                            {activeCount > 0 && (
                                <span
                                    className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                                    style={{ fontSize: '0.6rem' }}
                                >
                                    {activeCount}
                                </span>
                            )}
                        </button>

                        {/* Sortowanie */}
                        <Dropdown align="end">
                            <Dropdown.Toggle
                                variant="outline-secondary"
                                title="Sortuj"
                                className={sortOrder !== 'none' ? 'text-primary border-secondary' : ''}
                            >
                                <ArrowDownUp size={18} />
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                                <Dropdown.Item active={sortOrder === 'none'} onClick={() => setSortOrder('none')}>
                                    Domyślna kolejność
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item active={sortOrder === 'asc'} onClick={() => setSortOrder('asc')}>
                                    Nazwa A → Z
                                </Dropdown.Item>
                                <Dropdown.Item active={sortOrder === 'desc'} onClick={() => setSortOrder('desc')}>
                                    Nazwa Z → A
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </div>

                    {/* Panel filtrów */}
                    <Collapse in={filterOpen}>
                        <div>
                            <div className="pt-3 pb-1">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="fw-semibold" style={{ fontSize: '0.9rem' }}>Filtry</span>
                                    {activeCount > 0 && (
                                        <button
                                            className="btn btn-link btn-sm p-0 text-danger d-flex align-items-center gap-1"
                                            onClick={resetFilters}
                                        >
                                            <XLg size={12} /> Wyczyść
                                        </button>
                                    )}
                                </div>

                                {props.mode === 'containers' ? (
                                    <ContainerFilterPanel
                                        filters={props.filters}
                                        setFilters={props.setFilters}
                                        availableColors={props.availableColors ?? []}
                                    />
                                ) : (
                                    <ProductFilterPanel
                                        filters={props.filters}
                                        setFilters={props.setFilters}
                                    />
                                )}
                            </div>

                            {/* Aktywne filtry: nie renderujemy osobnych "pills" poniżej */}
                        </div>
                    </Collapse>
                </div>
            </Container>
        </div>
    );
};

export default SearchBar;