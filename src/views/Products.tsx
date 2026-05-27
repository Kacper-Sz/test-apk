import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Alert, Dropdown, Badge, Collapse, Modal, Button, ListGroup } from 'react-bootstrap';
import { ThreeDotsVertical, Ban, PlusCircle, ChevronDown, ChevronUp, TrashFill, XLg, ArrowClockwise, Box, ArrowsMove } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import type { ProductModel } from './types/models.ts';
import { useParams } from 'react-router-dom';
import Drawer from './components/Drawer';
import Header from './components/Header';
import SearchBar, { type ProductFilters } from './components/Searchbar';
import LoadingSpinner from './components/Spinner';
import { getStoredContainers, removeProductsFromContainer, saveContainers } from '../Storage.tsx';
import { apiFetch } from '../api.ts';
import { useLongPress } from 'use-long-press';


const Products: React.FC = () => {

    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [products, setProducts] = useState<ProductModel[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<ProductModel[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none');
    const [filters, setFilters] = useState<ProductFilters>({ expiration: 'all', tags: [] });
    const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
    const [containerName, setContainerName] = useState<string>('Kontener');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [deleteLoadingIds, setDeleteLoadingIds] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    const [showMoveModal, setShowMoveModal] = useState<boolean>(false);
    const [productsToMove, setProductsToMove] = useState<ProductModel[]>([]);
    const [selectedTargetContainerId, setSelectedTargetContainerId] = useState<string | null>(null);
    const [isMoving, setIsMoving] = useState<boolean>(false);

    const handleDeleteMultiple = async (products: ProductModel[]) => {
        const productIds = products.map(p => p.id).filter(id => id) as string[];
        if (!id || productIds.length === 0) return;

        setDeleteLoadingIds(productIds);
        try {
            const res = await apiFetch(`/api/Products/deleteproducts`, {
               method: "DELETE",
               body: JSON.stringify({
                containerId: id,
                productsIdToDelete: productIds
               })
            });
            const data = await res.json();
            if (data.status !== 0) {
                alert(`Błąd: ${data.message}`);
                return;
            }
            removeProductsFromContainer(id, productIds);
            setProducts(prev => prev.filter(p => !productIds.includes(p.id!)));
        } catch {
            alert('Błąd połączenia z serwerem.');
        } finally {
            setDeleteLoadingIds([]);
            setIsDeleting(false);
        }
    };

    const handleMoveProducts = async () => {
        if (!id || productsToMove.length === 0 || !selectedTargetContainerId) return;

        setIsMoving(true);
        try {
            let res;
            if (productsToMove.length === 1) {
                res = await apiFetch(`/api/Products/move/${productsToMove[0].id}`, {
                   method: "PUT",
                   body: JSON.stringify({
                    containerId: id,
                    newContainerId: selectedTargetContainerId
                   })
                });
            } else {
                res = await apiFetch(`/api/Products/moveproducts`, {
                   method: "PUT",
                   body: JSON.stringify({
                    containerId: id,
                    newContainerId: selectedTargetContainerId,
                    productsIdToMove: productsToMove.map(p => p.id).filter(pid => pid) as string[]
                   })
                });
            }

            const data = await res.json();
            if (data.status !== 0) {
                alert(`Błąd: ${data.message}`);
                return;
            }
            
            const movedIds = productsToMove.map(p => p.id);
            setProducts(prev => prev.filter(p => p.id && !movedIds.includes(p.id)));

            const containers = getStoredContainers();
            const updated = containers.map(c => {
                if (c.id === id) {
                    return { ...c, productList: (c.productList || []).filter(p => p.id && !movedIds.includes(p.id)) };
                }
                if (c.id === selectedTargetContainerId) {
                    const movedProducts = productsToMove.map(p => ({ ...p, containerId: selectedTargetContainerId }));
                    return { ...c, productList: [...(c.productList || []), ...movedProducts] };
                }
                return c;
            });
            saveContainers(updated);

            setShowMoveModal(false);
            setProductsToMove([]);
            setSelectedTargetContainerId(null);
            setIsSelectionMode(false);
        } catch {
            alert('Błąd połączenia z serwerem.');
        } finally {
            setIsMoving(false);
        }
    };

    // Wyodrębniona funkcja fetchowania — używana przy inicjalizacji i ręcznym odświeżeniu
    const fetchProducts = useCallback(async (showFullLoader = false) => {
        if (!id) return;

        if (showFullLoader) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }
        setError(null);

        try {
            const res = await apiFetch(`/api/Products/getproducts/${id}`);
            const data = await res.json();

            if (data.status !== 0) {
                setError(data.message || 'Błąd pobierania produktów');
                return;
            }

            const fetchedProducts: ProductModel[] = data.products || [];
            setProducts(fetchedProducts);

            // Nadpisujemy productList w localStorage dla tego kontenera
            const containers = getStoredContainers();
            const updated = containers.map(c =>
                c.id === id ? { ...c, productList: fetchedProducts } : c
            );
            saveContainers(updated);

        } catch {
            setError('Błąd połączenia z serwerem.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    useEffect(() => {
        if (!id) {
            setError('Brak ID kontenera');
            setLoading(false);
            return;
        }

        // Ustawiamy nazwę kontenera z localStorage (jest dostępna od razu)
        const allContainers = getStoredContainers();
        const container = allContainers.find(c => c.id === id);
        if (container) {
            setContainerName(container.containerName || 'Kontener');
            // Pokazujemy dane z cache na starcie, żeby nie było pustego ekranu
            const productList = (container.productList || []).filter(
                p => !p.containerId || p.containerId === id
            );
            setProducts(productList);
            setLoading(false);
        } else {
            setError('Nie znaleziono kontenera');
            setLoading(false);
        }
    }, [id]);

    const isExpiringSoon = (dateStr?: string): boolean => {
        if (!dateStr) return false;
        const expiry = new Date(dateStr);
        const diffDays = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 3;
    };

    const isExpired = (dateStr?: string): boolean => {
        if (!dateStr) return false;
        return new Date(dateStr) < new Date();
    };

    const filteredProducts = products
        .filter(product => {
            // Wyszukiwanie po nazwie
            if (!product.productName?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            // Filtr daty ważności
            if (filters.expiration !== 'all') {
                const hasDate = !!product.expirationDate;
                const expired = isExpired(product.expirationDate);
                const expiringSoon = !expired && isExpiringSoon(product.expirationDate);
                if (filters.expiration === 'no_date' && hasDate) return false;
                if (filters.expiration === 'has_date' && !hasDate) return false;
                if (filters.expiration === 'expired' && !expired) return false;
                if (filters.expiration === 'expiring_soon' && !expiringSoon) return false;
                if (filters.expiration === 'ok' && (expired || expiringSoon || !hasDate)) return false;
            }
            // (Tag filtering removed - only expiration filter is applied)
            return true;
        })
        .sort((a, b) => {
            if (sortOrder === 'asc') return (a.productName || '').localeCompare(b.productName || '');
            if (sortOrder === 'desc') return (b.productName || '').localeCompare(a.productName || '');
            return 0;
        });

    // (availableTags removed - tags not used in product filters)

    const toggleExpand = (productId: string) => {
        setExpandedId(prev => prev === productId ? null : productId);
    };

    const getProductKey = (product: ProductModel) => product.id || product.productName || '';

    const handleLongPress = useLongPress((event, _meta) => {
        setIsSelectionMode(true);
        const productCard = (event.target as Element).closest('.card') as HTMLElement;
        const product = products.find(p => p.id == productCard?.dataset.productId);
        if(product){
            if(!selectedProducts.some(p => p === product)){
                selectProduct(product);
            }
        }
    }, {
        onCancel: (event, _meta) => {
            if(isSelectionMode){
                const productCard = (event.target as Element).closest('.card') as HTMLElement;
                const product = products.find(p => p.id == productCard?.dataset.productId);
                if(product){
                    if(selectedProducts.some(p => p === product)){
                        unselectProduct(product);
                    }
                    else {
                        selectProduct(product);
                    }
                }
            }
        }
    });

    const selectProduct = (product: ProductModel) => {
        if(product && !selectedProducts.some(p => p === product)){
            setSelectedProducts(prev => [...prev, product]);
        }
    };

    const unselectProduct = (product: ProductModel) => {
        setSelectedProducts(prev => prev.filter(p => p !== product));
    };

    useEffect(() => {
        if(!isSelectionMode){
            setSelectedProducts([]);
        }
    }, [isSelectionMode]);

    return (
        <div>
        <Drawer open={drawerOpen} setOpen={setDrawerOpen}/>

        <Header
            title={containerName}
            onMenuClick={() => setDrawerOpen(true)}
            rightElement={
                <div className="d-flex align-items-center gap-2">
                    <button
                        className="btn btn-link p-0 text-body"
                        onClick={() => fetchProducts(false)}
                        disabled={refreshing}
                        aria-label="Odśwież produkty"
                    >
                        <ArrowClockwise
                            size={24}
                            style={refreshing ? { animation: 'spin 0.8s linear infinite' } : undefined}
                        />
                    </button>
                    <button className="btn btn-link p-0 text-body" onClick={() => navigate(`/containers/${id}/add-product`)}>
                        <PlusCircle size={28} />
                    </button>
                </div>
            }
        />

        <SearchBar
            mode="products"
            placeholderText="Szukaj produktu..."
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            filters={filters}
            setFilters={setFilters}
        />

        {!loading && !error && isSelectionMode && (
            <div className="w-auto bg-success p-2 text-white d-flex justify-content-between align-items-center">
                <p className="m-0 fw-bold">Zaznaczone: {selectedProducts.length}</p>
                <div>
                    <ArrowsMove size={28} className="me-3" onClick={() => {
                        setProductsToMove(selectedProducts);
                        setSelectedTargetContainerId(null);
                        setShowMoveModal(true);
                    }} />
                    <TrashFill size={28} className="me-3" onClick={() => {
                        setShowDeleteModal(true);
                    }} />
                    <XLg size={28} onClick={() =>setIsSelectionMode(false)}></XLg>
                </div>
            </div>
        )}

        <Container className="py-3">

        {loading && <LoadingSpinner message="Ładowanie produktów..." />}

        {error && (
            <Row>
                <Col>
                    <Alert variant="danger">{error}</Alert>
                </Col>
            </Row>
        )}

        {!loading && !error && (
        <div className="d-flex flex-column gap-2">
            {filteredProducts.map((product) => {
                const productKey = getProductKey(product);
                const isExpanded = expandedId === productKey;
                const expired = isExpired(product.expirationDate);
                const expiringSoon = !expired && isExpiringSoon(product.expirationDate);

                return (
                <Card 
                    data-product-id={product.id}
                    key={productKey}
                    className={`shadow-sm ${isSelectionMode && selectedProducts.some(p => p === product) ? 'bg-success-subtle border border-3 border-success' : ''}`}
                    {...handleLongPress()}
                >
                    <Card.Body className="py-2 px-3">
                        <div className="d-flex align-items-center gap-3">

                            <div
                                className="d-flex align-items-center justify-content-center flex-shrink-0 rounded bg-secondary-subtle"
                                style={{ width: 56, height: 56 }}
                            >
                                {product.imageUrl
                                    ? <img src={product.imageUrl} alt={product.productName} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 4 }} />
                                    : <Ban size={28} />
                                }
                            </div>

                            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                <div className="d-flex align-items-baseline gap-2">
                                    <span className="fw-bold text-truncate">{product.productName || 'Brak nazwy'}</span>
                                    {product.quantity && (
                                        <span className="text-muted small flex-shrink-0">{product.quantity} {'szt.'}</span>
                                    )}
                                </div>
                                <div className="d-flex align-items-center gap-2 mt-1 small">
                                    <span className="text-muted">{product.capacity ?? 0} {product.unit || ''}</span>
                                    <span className="text-muted">·</span>
                                    <span className={expired ? 'text-danger fw-semibold' : expiringSoon ? 'text-warning fw-semibold' : 'text-muted'}>
                                        {product.expirationDate
                                            ? new Date(product.expirationDate).toLocaleDateString('pl-PL')
                                            : 'brak daty'}
                                        {expired && ' (przeterminowany)'}
                                        {expiringSoon && ' (wkrótce wygaśnie)'}
                                    </span>
                                </div>
                            </div>

                            {/* Rozwiń */}
                            <button
                                className="btn btn-link p-1 text-secondary"
                                onClick={(e) => { e.stopPropagation(); toggleExpand(productKey); }}
                            >
                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>

                            {/* Menu kontekstowe */}
                            <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                <Dropdown
                                    align="end"
                                    show={openDropdownId === productKey}
                                    onToggle={(isOpen) => setOpenDropdownId(isOpen ? productKey : null)}
                                >
                                    <Dropdown.Toggle
                                        variant="link"
                                        bsPrefix=" "
                                        className="p-1 text-secondary border-0 bg-transparent"
                                    >
                                        <ThreeDotsVertical size={20} />
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu>
                                        <Dropdown.Item onClick={() => navigate(`/containers/${id}/edit-product/${product.id}`)}>
                                            Edytuj
                                        </Dropdown.Item>
                                        <Dropdown.Item onClick={() => {
                                            setProductsToMove([product]);
                                            setSelectedTargetContainerId(null);
                                            setShowMoveModal(true);
                                        }}>
                                            Przenieś
                                        </Dropdown.Item>
                                        <Dropdown.Item
                                            onClick={() => {
                                                setSelectedProducts([product]);
                                                setShowDeleteModal(true);
                                            }}
                                            className="text-danger"
                                            disabled={!product.id || deleteLoadingIds.includes(product.id)}
                                        >
                                            {!product.id || deleteLoadingIds.includes(product.id) ? 'Usuwanie...' : 'Usuń'}
                                        </Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown>
                            </div>

                        </div>
                    </Card.Body>

                    {/* Rozwinięta sekcja */}
                    <Collapse in={isExpanded}>
                        <div>
                            <Card.Body className="pt-0 px-3 pb-3 border-top">
                                {/* Pełna nazwa */}
                                <p className="fw-bold mb-2 pt-3">{product.productName || 'Brak nazwy'}</p>

                                {/* Opis */}
                                {product.description ? (
                                    <p className="small text-muted mb-2">{product.description}</p>
                                ) : (
                                    <p className="small text-muted fst-italic mb-2">Brak opisu</p>
                                )}

                                {/* Tagi */}
                                {product.tags && product.tags.filter(t => t !== 'null' && t !== '"null"').length > 0 && (
                                    <div className="d-flex flex-wrap gap-1 mb-2">
                                        {product.tags.filter(t => t !== 'null' && t !== '"null"').map((tag, i) => (
                                            <Badge key={i} bg="secondary" className="fw-normal">
                                                {tag.replace(/^"|"$/g, '')}
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                {/* Dodatkowe info */}
                                <div className="d-flex flex-column gap-1 small text-muted">
                                    {product.addedDate && (
                                        <span>
                                            Dodano: {new Date(product.addedDate).toLocaleDateString('pl-PL')}
                                        </span>
                                    )}
                                    {product.expirationDate && (
                                        <span className={expired ? 'text-danger' : expiringSoon ? 'text-warning' : ''}>
                                            Ważny do: {new Date(product.expirationDate).toLocaleDateString('pl-PL')}
                                            {expired && ' — przeterminowany!'}
                                            {expiringSoon && ' — wkrótce wygaśnie!'}
                                        </span>
                                    )}
                                    {product.capacity && (
                                        <span>Pojemność: {product.capacity} {product.unit || ''}</span>
                                    )}
                                </div>

                            </Card.Body>
                        </div>
                    </Collapse>
                </Card>
                );
            })}
        </div>
        )}

        {!loading && !error && filteredProducts.length === 0 && (
        <Row>
            <Col>
                <Alert variant="info">
                    {searchTerm || filters.expiration !== 'all'
                        ? 'Brak produktów spełniających kryteria wyszukiwania'
                        : 'Brak produktów w tym kontenerze'}
                </Alert>
            </Col>
        </Row>
        )}
        </Container>
    
        {/* Modal potwierdzenia usunięcia produktów */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
            <Modal.Header closeButton>
                <Modal.Title>{selectedProducts.length > 1 ? `Usuń ${selectedProducts.length} produktów` : `Usuń produkt`}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p className="mb-3">
                    <strong>
                        {
                            selectedProducts.length > 1 ?
                            `Czy na pewno chcesz usunąć ${selectedProducts.length} produktów z kontenera "${containerName}"?` :
                            `Czy na pewno chcesz usunąć "${selectedProducts[0]?.productName}" z kontenera "${containerName}"?`
                        }
                    </strong>
                </p>
                <p className="text-muted small mb-3">
                    Ta operacja jest nieodwracalna.
                </p>
        </Modal.Body>
            <Modal.Footer className="d-flex justify-content-evenly">
                <Button
                    variant="secondary"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={isDeleting}
                >
                    Anuluj
                </Button>
                <Button
                    variant="danger"
                    onClick={() => {
                        handleDeleteMultiple(selectedProducts);
                        setShowDeleteModal(false);
                        setIsSelectionMode(false);
                    }}
                    disabled={isDeleting}
                >
                    {isDeleting ? 'Usuwanie...' : 'Usuń'}
                </Button>
            </Modal.Footer>
        </Modal>

        {/* Modal przeniesienia produktu */}
        <Modal show={showMoveModal} onHide={() => setShowMoveModal(false)} centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    {productsToMove.length > 1 
                        ? `Przenieś ${productsToMove.length} produktów` 
                        : `Przenieś produkt: ${productsToMove[0]?.productName}`}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p className="mb-3">Wybierz docelowy kontener:</p>
                <ListGroup style={{ maxHeight: 220, overflowY: 'auto' }}>
                    {getStoredContainers().filter(c => c.id !== id).map(c => (
                        <ListGroup.Item
                            key={c.id}
                            action
                            active={selectedTargetContainerId === c.id}
                            onClick={() => setSelectedTargetContainerId(c.id!)}
                            className="d-flex align-items-center gap-3 py-2"
                            style={{ cursor: 'pointer' }}
                        >
                            <div
                                className="d-flex align-items-center justify-content-center flex-shrink-0 rounded bg-secondary-subtle"
                                style={{ width: 40, height: 40 }}
                            >
                                {c.imageUrl 
                                    ? <img src={c.imageUrl} alt={c.containerName} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                                    : <span className="text-muted"><Box size={20} /></span>
                                }
                            </div>
                            <div className="flex-grow-1">
                                <span className="fw-bold">{c.containerName}</span>
                            </div>
                        </ListGroup.Item>
                    ))}
                    {getStoredContainers().filter(c => c.id !== id).length === 0 && (
                        <Alert variant="warning" className="mb-0">Brak innych kontenerów do wyboru.</Alert>
                    )}
                </ListGroup>
            </Modal.Body>
            <Modal.Footer className="d-flex justify-content-evenly">
                <Button variant="secondary" onClick={() => setShowMoveModal(false)} disabled={isMoving}>
                    Anuluj
                </Button>
                <Button 
                    variant="primary" 
                    onClick={handleMoveProducts} 
                    disabled={isMoving || !selectedTargetContainerId}
                >
                    {isMoving ? 'Przenoszenie...' : 'Przenieś'}
                </Button>
            </Modal.Footer>
        </Modal>

        {/* Animacja obrotu dla ikony odświeżania */}
        <style>{`
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `}</style>
    </div>
    );
};

export default Products;