import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Dropdown, Badge, Collapse } from 'react-bootstrap';
import { ThreeDotsVertical, Ban, PlusCircle, ChevronDown, ChevronUp } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import type { ProductModel } from './types/models.ts';
import { useParams } from 'react-router-dom';
import Drawer from './components/Drawer';
import Header from './components/Header';
import SearchBar from './components/Searchbar';
import LoadingSpinner from './components/Spinner';
import { getStoredContainers, removeProductFromContainer } from '../Storage.tsx';
import { apiFetch } from '../api.ts';


const Products: React.FC = () => {

    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [products, setProducts] = useState<ProductModel[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none');
    const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
    const [containerName, setContainerName] = useState<string>('Kontener');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

    const handleDelete = async (product: ProductModel) => {
        if (!id || !product.id) return;
        //if (!window.confirm(`Czy na pewno chcesz usunąć "${product.productName}"?`)) return;

        setDeleteLoadingId(product.id);
        try {
            const res = await apiFetch(`/api/Products/delete/${product.id}`, {
                method: 'DELETE',
                body: JSON.stringify({ containerId: id }),
            });
            const data = await res.json();
            if (data.status !== 0) {
                alert(`Błąd: ${data.message}`);
                return;
            }
            removeProductFromContainer(id, product.id);
            setProducts(prev => prev.filter(p => p.id !== product.id));
        } catch {
            alert('Błąd połączenia z serwerem.');
        } finally {
            setDeleteLoadingId(null);
        }
    };

    useEffect(() => {
        if (!id) {
            setError('Brak ID kontenera');
            setLoading(false);
            return;
        }

        const allContainers = getStoredContainers();
        const container = allContainers.find(c => c.id === id);

        if (container) {
            setContainerName(container.containerName || 'Kontener');
            const productList = (container.productList || []).filter(
                p => !p.containerId || p.containerId === id
            );
            setProducts(productList);
        } else {
            setError('Nie znaleziono kontenera');
        }

        setLoading(false);
    }, [id]);

    const filteredProducts = products
        .filter(product =>
            product.productName?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (sortOrder === 'asc') return (a.productName || '').localeCompare(b.productName || '');
            if (sortOrder === 'desc') return (b.productName || '').localeCompare(a.productName || '');
            return 0;
        });

    const toggleExpand = (productId: string) => {
        setExpandedId(prev => prev === productId ? null : productId);
    };

    const getProductKey = (product: ProductModel) => product.id || product.productName || '';

    const isExpiringSoon = (dateStr?: string): boolean => {
        if (!dateStr) return false;
        const expiry = new Date(dateStr);
        const diffDays = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7;
    };

    const isExpired = (dateStr?: string): boolean => {
        if (!dateStr) return false;
        return new Date(dateStr) < new Date();
    };

    return (
        <div>
        <Drawer open={drawerOpen} setOpen={setDrawerOpen}/>

        <Header
            title={containerName}
            onMenuClick={() => setDrawerOpen(true)}
            rightElement={
                <button className="btn btn-link p-0 text-body" onClick={() => navigate(`/containers/${id}/add-product`)}>
                    <PlusCircle size={28} />
                </button>
            }
        />

        <SearchBar
            placeholderText="Szukaj produktu..."
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
        />

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
                <Card key={productKey} className="shadow-sm">
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

                            <div className="flex-grow-1">
                                <div className="d-flex align-items-baseline gap-2">
                                    <span className="fw-bold">{product.productName || 'Brak nazwy'}</span>
                                    {product.quantity && (
                                        <span className="text-muted small">{product.quantity} {'szt.'}</span>
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
                                        <Dropdown.Item
                                            onClick={() => handleDelete(product)}
                                            className="text-danger"
                                            disabled={deleteLoadingId === product.id}
                                        >
                                            {deleteLoadingId === product.id ? 'Usuwanie...' : 'Usuń'}
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

                                {/* Opis */}
                                {product.description ? (
                                    <p className="small text-muted mb-2">{product.description}</p>
                                ) : (
                                    <p className="small text-muted fst-italic mb-2">Brak opisu</p>
                                )}

                                {/* Tagi */}
                                {product.tags && product.tags.length > 0 && (
                                    <div className="d-flex flex-wrap gap-1 mb-2">
                                        {product.tags.map((tag, i) => (
                                            <Badge key={i} bg="secondary" className="fw-normal">{tag}</Badge>
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
                    {searchTerm ? 'Brak produktów spełniających kryteria wyszukiwania' : 'Brak produktów w tym kontenerze'}
                </Alert>
            </Col>
        </Row>
        )}
        </Container>
        </div>
    );
};

export default Products;