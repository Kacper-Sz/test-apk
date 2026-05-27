import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Alert, Dropdown, Badge, Collapse, Modal, Button, ListGroup, Form } from 'react-bootstrap';
import { PlusCircle, Box, ChevronDown, ChevronUp, ThreeDotsVertical, XLg, TrashFill, ArrowRightCircle } from 'react-bootstrap-icons';
import type { ContainerModel } from './types/models.ts';
import { getUserRole, canPerformAction } from './types/models.ts';
import LoadingSpinner from './components/Spinner';
import Drawer from './components/Drawer';
import Header from './components/Header';
import SearchBar, { type ContainerFilters } from './components/Searchbar';
import { apiFetch } from '../api.ts';
import { getStoredContainers, getUser, saveContainers, saveFriends } from '../Storage.tsx';
import { useLongPress } from 'use-long-press';

const STRIP_COLORS: Record<string, string> = {
    'Red': '#e74c3c',
    'Blue': '#3498db',
    'Green': '#2ecc71',
    'Yellow': '#f1c40f',
    'Orange': '#e67e22',
    'Purple': '#9b59b6',
    'White': '#ffffff',
    'Gray': '#95a5a6'
};

// mozna modal przeniesc do drugiego pliku czy cos najleoiej
// ─── Delete Modal ─────────────────────────────────────────────────────────────

interface DeleteModalState {
    open: boolean;
    /** Kontenery do usunięcia (1 lub więcej) */
    targets: ContainerModel[];
}

interface DeleteContainerModalProps {
    state: DeleteModalState;
    availableContainers: ContainerModel[];   // kontenery NIE będące targets
    onConfirm: (otherContainerId: string | null) => void;
    onClose: () => void;
}

const DeleteContainerModal: React.FC<DeleteContainerModalProps> = ({
    state,
    availableContainers,
    onConfirm,
    onClose,
}) => {
    const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
    const [transferMode, setTransferMode] = useState<'none' | 'transfer'>('none');

    // reset przy każdym otwarciu
    useEffect(() => {
        if (state.open) {
            setSelectedContainerId(null);
            setTransferMode('none');
        }
    }, [state.open]);

    const isSingle = state.targets.length === 1;
    const totalProducts = state.targets.reduce(
        (sum, c) => sum + (c.productList?.length ?? 0), 0
    );
    const hasProducts = totalProducts > 0;

    const handleConfirm = () => {
        if (transferMode === 'transfer' && !selectedContainerId) return; // guard
        onConfirm(transferMode === 'transfer' ? selectedContainerId : null);
    };

    const canConfirm =
        transferMode === 'none' ||
        (transferMode === 'transfer' && selectedContainerId !== null);

    return (
        <Modal show={state.open} onHide={onClose} centered>
            <Modal.Header closeButton>
                <Modal.Title className="fs-6 fw-bold">
                    {isSingle
                        ? `Usuń „${state.targets[0]?.containerName ?? 'kontener'}"`
                        : `Usuń ${state.targets.length} kontenery`}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {/* Ostrzeżenie */}
                <Alert variant="danger" className="py-2 mb-3" style={{ fontSize: '0.875rem' }}>
                    {isSingle
                        ? 'Ta operacja jest nieodwracalna.'
                        : `Zostaną usunięte: ${state.targets.map(c => c.containerName).join(', ')}.`}
                </Alert>

                {/* Produkty */}
                {hasProducts ? (
                    <>
                        <p className="mb-2" style={{ fontSize: '0.9rem' }}>
                            {isSingle
                                ? `Ten kontener zawiera ${totalProducts} ${productWord(totalProducts)}. Co chcesz z nimi zrobić?`
                                : `Łącznie ${totalProducts} ${productWord(totalProducts)} zostanie usuniętych. Co chcesz z nimi zrobić?`}
                        </p>

                        <div className="d-flex flex-column gap-2 mb-3">
                            <Form.Check
                                type="radio"
                                id="mode-none"
                                label="Usuń produkty razem z kontenerem"
                                checked={transferMode === 'none'}
                                onChange={() => { setTransferMode('none'); setSelectedContainerId(null); }}
                            />
                            <Form.Check
                                type="radio"
                                id="mode-transfer"
                                label="Przenieś produkty do innego kontenera"
                                checked={transferMode === 'transfer'}
                                onChange={() => setTransferMode('transfer')}
                                disabled={availableContainers.length === 0}
                            />
                            {availableContainers.length === 0 && transferMode !== 'transfer' && (
                                <p className="text-muted ms-4 mb-0" style={{ fontSize: '0.8rem' }}>
                                    Brak innych kontenerów do przeniesienia produktów.
                                </p>
                            )}
                        </div>

                        {/* Lista kontenerów do wyboru */}
                        {transferMode === 'transfer' && (
                            <ListGroup style={{ maxHeight: 220, overflowY: 'auto' }}>
                                {availableContainers.map(c => (
                                    <ListGroup.Item
                                        key={c.id}
                                        action
                                        active={selectedContainerId === c.id}
                                        onClick={() => setSelectedContainerId(c.id!)}
                                        className="d-flex align-items-center gap-3 py-2"
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div
                                            className="d-flex align-items-center justify-content-center flex-shrink-0 rounded bg-secondary-subtle"
                                            style={{ width: 40, height: 40 }}
                                        >
                                            {c.imageUrl
                                                ? <img src={c.imageUrl} alt={c.containerName} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                                                : <Box size={20} />}
                                        </div>
                                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                            <div className="fw-semibold text-truncate" style={{ fontSize: '0.9rem' }}>
                                                {c.containerName || 'Brak nazwy'}
                                            </div>
                                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                {c.productList?.length ?? 0} {productWord(c.productList?.length ?? 0)}
                                            </div>
                                        </div>
                                        {selectedContainerId === c.id && (
                                            <ArrowRightCircle size={18} className="text-primary flex-shrink-0" />
                                        )}
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        )}
                    </>
                ) : (
                    <p className="mb-0" style={{ fontSize: '0.9rem' }}>
                        {isSingle
                            ? 'Ten kontener jest pusty. Czy na pewno chcesz go usunąć?'
                            : 'Wybrane kontenery są puste. Czy na pewno chcesz je usunąć?'}
                    </p>
                )}
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" size="sm" onClick={onClose}>
                    Anuluj
                </Button>
                <Button
                    variant="danger"
                    size="sm"
                    onClick={handleConfirm}
                    disabled={!canConfirm}
                >
                    {transferMode === 'transfer' && selectedContainerId
                        ? 'Przenieś i usuń'
                        : 'Usuń'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

const productWord = (count: number): string => {
    if (count === 1) return 'produkt';
    if (count >= 2 && count <= 4) return 'produkty';
    return 'produktów';
};

// ─── Containers ───────────────────────────────────────────────────────────────

const Containers: React.FC = () => {
    const [containers, setContainers] = useState<ContainerModel[]>(getStoredContainers());
    const [selectedContainers, setSelectedContainers] = useState<ContainerModel[]>([]);
    const [loading, setLoading] = useState<boolean>(containers.length === 0);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none');
    const [filters, setFilters] = useState<ContainerFilters>({ sharing: 'all', role: 'all', stripColor: null });
    const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [permissionError, setPermissionError] = useState<string | null>(null);

    // Modal stanu usuwania
    const [deleteModal, setDeleteModal] = useState<DeleteModalState>({ open: false, targets: [] });

    const navigate = useNavigate();
    const currentUser = getUser();

    const fetchFriends = async () => {
        const friendIds: string[] = currentUser?.friends ?? [];
        if (friendIds.length === 0) return;
        try {
            const res = await apiFetch('/api/users/users', {
                method: 'POST',
                body: JSON.stringify({ usersId: friendIds }),
            });
            const data = await res.json();
            if (data.status === 0 && Array.isArray(data.users)) {
                saveFriends(data.users);
            }
        } catch (err) {
            console.warn('Nie udało się odświeżyć znajomych:', err);
        }
    };

    useEffect(() => {
        fetchFriends();
        fetchContainers();
    }, []);

    const fetchContainers = async () => {
        try {
            setLoading(true);

            const user = getUser();
            if (!user?.id) {
                setError('Brak danych użytkownika.');
                return;
            }

            const res = await apiFetch(`/api/Containers/containers/${user.id}`, {
                method: 'GET'
            });

            const data = await res.json();

            if (data.status !== 0) {
                setError(`Błąd: ${data.message}`);
                return;
            }

            saveContainers(data.containers);
            setContainers(data.containers);
            setError(null);
        } catch (err) {
            setError('Błąd połączenia z serwerem.');
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const showPermissionError = () => {
        setPermissionError('Potrzebujesz wyższych uprawnień, aby wykonać tę akcję.');
        setTimeout(() => setPermissionError(null), 4000);
    };

    // ── Otwieranie modalu ──────────────────────────────────────────────────────

    const openDeleteModal = (targets: ContainerModel[]) => {
        // Sprawdź uprawnienia przed otwarciem modalu
        const unauthorized = targets.filter(c => {
            const role = getUserRole(c, currentUser?.id ?? '');
            return !canPerformAction(role, 'Owner');
        });
        if (unauthorized.length > 0) {
            showPermissionError();
            return;
        }
        setDeleteModal({ open: true, targets });
    };

    const closeDeleteModal = () => setDeleteModal({ open: false, targets: [] });

    // ── Właściwe usuwanie (po potwierdzeniu w modalu) ─────────────────────────

    const handleDeleteConfirm = async (otherContainerId: string | null) => {
        const { targets } = deleteModal;
        closeDeleteModal();

        if (targets.length === 1) {
            await doRemoveOne(targets[0], otherContainerId);
        } else {
            await doRemoveMany(targets, otherContainerId);
        }
    };

    const doRemoveOne = async (container: ContainerModel, otherContainerId: string | null) => {
        try {
            const res = await apiFetch(`/api/Containers/delete/${container.id}`, {
                method: 'DELETE',
                body: JSON.stringify({ OtherContainerId: otherContainerId }),
            });

            if (res.status === 403) { showPermissionError(); return; }

            const data = await res.json();
            if (data.status !== 0) { setError(`Błąd: ${data.message}`); return; }

            if (otherContainerId) {
                await fetchContainers();
            } else {
                const updated = containers.filter(c => c.id !== container.id);
                setContainers(updated);
                saveContainers(updated);
            }
            setError(null);
        } catch (err) {
            setError('Błąd połączenia z serwerem.');
            console.error('Error:', err);
        }
    };

    const doRemoveMany = async (targets: ContainerModel[], otherContainerId: string | null) => {
        try {
            const ids = targets.map(c => c.id!);

            const res = await apiFetch(`/api/Containers/deletecontainers`, {
                method: 'DELETE',
                body: JSON.stringify({
                    containersId: ids,
                    otherContainerId,
                }),
            });

            if (res.status === 403) { showPermissionError(); return; }

            const data = await res.json();
            if (data.status !== 0) { setError(`Błąd: ${data.message}`); return; }

            if (otherContainerId) {
                await fetchContainers();
            } else {
                const updated = containers.filter(c => !ids.includes(c.id!));
                setContainers(updated);
                saveContainers(updated);
            }
            setIsSelectionMode(false);
            setError(null);
        } catch (err) {
            setError('Błąd połączenia z serwerem.');
            console.error('Error:', err);
        }
    };

    // ── Helpers ────────────────────────────────────────────────────────────────

    const filteredContainers = containers
        .filter(c => {
            // Wyszukiwanie po nazwie
            if (!c.containerName?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            // Filtr dostępności
            if (filters.sharing === 'shared' && !(c.isForMoreUsers || (c.userList && c.userList.length > 0))) return false;
            if (filters.sharing === 'private' && (c.isForMoreUsers || (c.userList && c.userList.length > 0))) return false;
            // Filtr roli
            if (filters.role !== 'all') {
                const role = getUserRole(c, currentUser?.id ?? '');
                if (role !== filters.role) return false;
            }
            // Filtr koloru paska
            if (filters.stripColor !== null && c.containerStripColor?.name !== filters.stripColor) return false;
            return true;
        })
        .sort((a, b) => {
            if (sortOrder === 'asc') return (a.containerName || '').localeCompare(b.containerName || '');
            if (sortOrder === 'desc') return (b.containerName || '').localeCompare(a.containerName || '');
            return 0;
        });

    // Kolory dostępne w obecnym zbiorze kontenerów (do panelu filtrów)
    const availableColors = [...new Set(
        containers.map(c => c.containerStripColor?.name).filter(Boolean) as string[]
    )];

    const toggleExpand = (id: string) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    const formatProductCount = (count: number) => {
        if (count === 1) return '1 Produkt';
        if (count >= 2 && count <= 4) return `${count} Produkty`;
        return `${count} Produktów`;
    };

    const handleLongPress = useLongPress((event, _meta) => {
        setIsSelectionMode(true);
        const containerCard = (event.target as Element).closest('.card') as HTMLElement;
        const container = containers.find(c => c.id == containerCard?.dataset.containerId);
        if (container) {
            if (!selectedContainers.some(c => c === container)) {
                selectContainer(container);
            }
        }
    }, {
        onCancel: (event, _meta) => {
            if (isSelectionMode) {
                const containerCard = (event.target as Element).closest('.card') as HTMLElement;
                const container = containers.find(c => c.id == containerCard?.dataset.containerId);
                if (container) {
                    if (selectedContainers.some(c => c === container)) {
                        unselectContainer(container);
                    } else {
                        selectContainer(container);
                    }
                }
            }
        }
    });

    const selectContainer = (container: ContainerModel) => {
        if (container && !selectedContainers.some(c => c === container)) {
            setSelectedContainers(prev => [...prev, container]);
        }
    };

    const unselectContainer = (container: ContainerModel) => {
        setSelectedContainers(prev => prev.filter(c => c !== container));
    };

    useEffect(() => {
        if (!isSelectionMode) {
            setSelectedContainers([]);
        }
    }, [isSelectionMode]);

    // Kontenery dostępne jako cel przeniesienia (nie są wśród usuwanych i user ma do nich dostęp)
    const availableForTransfer = (targets: ContainerModel[]) => {
        const targetIds = new Set(targets.map(c => c.id));
        return containers.filter(c => !targetIds.has(c.id));
    };

    return (
        <>
            <Drawer open={drawerOpen} setOpen={setDrawerOpen} />

            <Header
                title="Kontenery"
                onMenuClick={() => setDrawerOpen(true)}
                rightElement={
                    <button className="btn btn-link p-0 text-body" onClick={() => navigate('/add-container')}>
                        <PlusCircle size={28} />
                    </button>
                }
                showBackButton={false}
            />

            <SearchBar
                mode="containers"
                placeholderText="Szukaj kontenera..."
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                filters={filters}
                setFilters={setFilters}
                availableColors={availableColors}
            />

            {permissionError && (
                <Alert variant="warning" className="mx-3 mt-2 mb-0 py-2" style={{ fontSize: '0.9rem' }}>
                    🔒 {permissionError}
                </Alert>
            )}

            {!loading && !error && isSelectionMode && (
                <div className="w-auto bg-success p-2 text-white d-flex justify-content-between align-items-center">
                    <p className="m-0 fw-bold">Zaznaczone: {selectedContainers.length}</p>
                    <div>
                        <TrashFill
                            size={28}
                            className="me-3"
                            style={{ cursor: 'pointer' }}
                            onClick={() => openDeleteModal(selectedContainers)}
                        />
                        <XLg size={28} style={{ cursor: 'pointer' }} onClick={() => setIsSelectionMode(false)} />
                    </div>
                </div>
            )}

            <Container className="py-3">

                {loading && <LoadingSpinner message="Ładowanie kontenerów..." />}

                {error && (
                    <Row>
                        <Col>
                            <Alert variant="danger">{error}</Alert>
                        </Col>
                    </Row>
                )}

                {!loading && !error && (
                    <div className="d-flex flex-column gap-2">
                        {filteredContainers.map((container) => {
                            const isExpanded = expandedId === container.id;
                            const productCount = container.productList?.length ?? 0;
                            const role = getUserRole(container, currentUser?.id ?? '');
                            const isOwner = canPerformAction(role, 'Owner');
                            const canEdit = canPerformAction(role, 'Admin');
                            const stripColor = container.containerStripColor?.name ? STRIP_COLORS[container.containerStripColor.name] : null;

                            return (
                                <Card
                                    data-container-id={container.id}
                                    key={container.id}
                                    className={`shadow-sm ${selectedContainers.some(c => c === container) ? 'bg-success-subtle border border-3 border-success' : ''}`}
                                    style={{ cursor: 'pointer', borderLeft: stripColor ? `10px solid ${stripColor}` : undefined }}
                                    onClick={() => {
                                        if (!isSelectionMode) navigate(`/containers/${container.id}`);
                                    }}
                                    {...handleLongPress()}
                                >
                                    {/* Główny wiersz */}
                                    <Card.Body className="py-2 px-3">
                                        <div className="d-flex align-items-center gap-3">

                                            {/* Ikona */}
                                            <div
                                                className="d-flex align-items-center justify-content-center flex-shrink-0 rounded bg-secondary-subtle"
                                                style={{ width: 56, height: 56 }}
                                            >
                                                {container.imageUrl
                                                    ? <img src={container.imageUrl} alt={container.containerName} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 4 }} />
                                                    : <Box size={28} />
                                                }
                                            </div>

                                            {/* Nazwa i liczba produktów */}
                                            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                                <div className="fw-bold text-truncate">{container.containerName || 'Brak nazwy'}</div>
                                                <div className="small text-muted">{formatProductCount(productCount)}</div>
                                                {role && (
                                                    <Badge
                                                        className="fw-normal mt-1 border"
                                                        style={{ 
                                                            fontSize: '0.7rem', 
                                                            backgroundColor: '#c4a484',
                                                            color: '#fff'
                                                        }}
                                                    >
                                                        {role}
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Rozwiń */}
                                            <button
                                                className="btn btn-link p-1 text-secondary"
                                                onClick={(e) => { e.stopPropagation(); toggleExpand(container.id!); }}
                                            >
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </button>

                                            {/* Menu kontekstowe */}
                                            <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <Dropdown
                                                    align="end"
                                                    show={openDropdownId === container.id}
                                                    onToggle={(isOpen) => setOpenDropdownId(isOpen ? container.id! : null)}
                                                >
                                                    <Dropdown.Toggle
                                                        variant="link"
                                                        bsPrefix=" "
                                                        className="p-1 text-secondary border-0 bg-transparent"
                                                    >
                                                        <ThreeDotsVertical size={20} />
                                                    </Dropdown.Toggle>
                                                    <Dropdown.Menu>
                                                        <Dropdown.Item
                                                            onClick={() => {
                                                                if (!canEdit) {
                                                                    showPermissionError();
                                                                    return;
                                                                }
                                                                navigate(`/containers/${container.id}/edit-container`);
                                                            }}
                                                            className={!canEdit ? 'text-muted' : ''}
                                                        >
                                                            Edytuj {!canEdit && '🔒'}
                                                        </Dropdown.Item>
                                                        <Dropdown.Item
                                                            onClick={() => {
                                                                if (!isOwner) {
                                                                    showPermissionError();
                                                                    return;
                                                                }
                                                                openDeleteModal([container]);
                                                            }}
                                                            className={isOwner ? 'text-danger' : 'text-muted'}
                                                        >
                                                            Usuń {!isOwner && '🔒'}
                                                        </Dropdown.Item>
                                                    </Dropdown.Menu>
                                                </Dropdown>
                                            </div>
                                        </div>
                                    </Card.Body>

                                    {/* Rozwinięta sekcja */}
                                    <Collapse in={isExpanded}>
                                        <div>
                                            <Card.Body className="pt-3 px-3 pb-3 border-top">
                                                {/* Pełna nazwa */}
                                                <p className="fw-bold mb-2">{container.containerName || 'Brak nazwy'}</p>

                                                {/* Opis */}
                                                {container.description && (
                                                    <p className="small text-muted mb-2">{container.description}</p>
                                                )}

                                                {/* Tagi */}
                                                {container.tags && container.tags.filter(t => t !== 'null' && t !== '"null"').length > 0 && (
                                                    <div className="d-flex flex-wrap gap-1 mb-2">
                                                        {container.tags.filter(t => t !== 'null' && t !== '"null"').map((tag, index) => (
                                                            <Badge key={index} bg="secondary" className="fw-normal">
                                                                {tag.replace(/^"|"$/g, '')}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Info o dostępie */}
                                                <div className="small text-muted">
                                                    {(container.isForMoreUsers || (container.userList && container.userList.length > 0))
                                                        ? `Współdzielony z ${container.userList?.length ?? 0} użytkownikami`
                                                        : 'Tylko Twój kontener'
                                                    }
                                                </div>
                                            </Card.Body>
                                        </div>
                                    </Collapse>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {!loading && !error && filteredContainers.length === 0 && (
                    <Row>
                        <Col>
                            <Alert variant="info">
                                {searchTerm || filters.sharing !== 'all' || filters.role !== 'all' || filters.stripColor !== null
                                    ? 'Brak kontenerów spełniających kryteria wyszukiwania'
                                    : 'Brak kontenerów'}
                            </Alert>
                        </Col>
                    </Row>
                )}

            </Container>

            {/* Modal usuwania */}
            <DeleteContainerModal
                state={deleteModal}
                availableContainers={availableForTransfer(deleteModal.targets)}
                onConfirm={handleDeleteConfirm}
                onClose={closeDeleteModal}
            />
        </>
    );
};

export default Containers;