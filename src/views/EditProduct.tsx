import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, Card, Form, InputGroup, Button, Alert } from 'react-bootstrap';
import { CameraFill, PencilFill, Stars, Search } from 'react-bootstrap-icons';
//import 'bootstrap/dist/css/bootstrap.min.css';
import Drawer from './components/Drawer';
import Header from './components/Header';
import { getStoredProductsByContainerId, updateProductInContainer } from '../Storage';
import { apiFetch } from '../api';


// TRZEBA ODSWIEZAC WIDOK BO OPERUJE NA STARYCH DANYCH DALEJ!!!!
const UNITS = ['szt.', 'kg', 'g', 'l', 'ml', 'op.'];

const EditProduct: React.FC = () => {
    const { id: containerId, productId } = useParams<{ id: string; productId: string }>();
    const navigate = useNavigate();

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expirationDate, setExpirationDate] = useState('');
    const [name, setName] = useState('');
    const [quantity, setQuantity] = useState<number>(1);
    const [capacity, setCapacity] = useState<number>(1);
    const [unit, setUnit] = useState('szt.');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [description, setDescription] = useState('');

    const isFormValid = name.trim().length > 0;

    useEffect(() => {
        if (!containerId || !productId) {
            setNotFound(true);
            return;
        }

        const products = getStoredProductsByContainerId(containerId);
        const product = products.find(p => p.id === productId);

        if (!product) {
            setNotFound(true);
            return;
        }

        setName(product.productName || '');
        setQuantity(product.quantity ?? 1);
        setCapacity(product.capacity ?? 1);
        setUnit(product.unit || 'szt.');
        setTags(product.tags || []);
        setExpirationDate(product.expirationDate || '');
        setDescription(product.description || '');
    }, [containerId, productId]);

    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
            e.preventDefault();
            const newTag = tagInput.trim().replace(/,$/, '');
            if (newTag && !tags.includes(newTag)) {
                setTags(prev => [...prev, newTag]);
            }
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setTags(prev => prev.filter(t => t !== tag));
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        
        try {
            await apiFetch(`/api/Products/changedata/${productId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    containerId,
                    productId,
                    newProductName: name.trim() || null,
                    newQuantity: quantity ?? null,
                    newUnit: unit || null,
                    newCapacity: capacity ?? null,
                    newDescription: description.trim() || null,
                    newTags: tags.length > 0 ? tags : null,
                    newExpirationDate: expirationDate
                        ? new Date(expirationDate).toISOString()
                        : null,
                }),
            });
        
            
            updateProductInContainer(containerId!, {
                id: productId!,
                productName: name.trim(),
                quantity,
                unit,
                capacity,
                description: description.trim(),
                tags,
                expirationDate: expirationDate
                    ? new Date(expirationDate).toISOString()
                    : undefined,
            });

            navigate(`/containers/${containerId}`);
        } catch {
            setError('Błąd połączenia z serwerem.');
        } finally {
            setLoading(false);
        }
    };

    if (notFound) {
        return (
            <Container className="py-4">
                <Alert variant="danger">Nie znaleziono produktu.</Alert>
                <Button variant="outline-dark" onClick={() => navigate(`/containers/${containerId}`)}>
                    Wróć do kontenera
                </Button>
            </Container>
        );
    }

    return (
        <>
            <Drawer open={drawerOpen} setOpen={setDrawerOpen} />

            <Header
                title="Edytuj produkt"
                onMenuClick={() => setDrawerOpen(true)}
                rightElement={null}
            />

            <Container className="py-4">

                {/* Zdjęcie / ikona */}
                <Card className="shadow-sm mb-3">
                    <Card.Body className="py-3 px-3">
                        <div className="position-relative mx-auto" style={{ width: 160, height: 160 }}>
                            <div
                                className="w-100 h-100 rounded d-flex align-items-center justify-content-center bg-secondary-subtle"
                                style={{ fontSize: '0.85rem', color: '#aaa', border: '2px dashed #ccc' }}
                            >
                                <span className="text-center text-muted small">
                                    Tutaj<br />zdjęcie/<br />ikonka
                                </span>
                            </div>
                            <button
                                className="btn btn-dark rounded-circle d-flex align-items-center justify-content-center position-absolute"
                                style={{ width: 36, height: 36, bottom: -8, left: -8 }}
                                onClick={() => console.log('TODO: aparat')}
                            >
                                <CameraFill size={16} />
                            </button>
                            <button
                                className="btn btn-dark rounded-circle d-flex align-items-center justify-content-center position-absolute"
                                style={{ width: 36, height: 36, bottom: -8, right: -8 }}
                                onClick={() => console.log('TODO: pisak czy co to tam jest')}
                            >
                                <PencilFill size={16} />
                            </button>
                        </div>
                    </Card.Body>
                </Card>

                {/* Nazwa */}
                <Card className="shadow-sm mb-3">
                    <Card.Body className="py-3 px-3">
                        <InputGroup>
                            <Form.Control
                                type="text"
                                placeholder="Nazwa..."
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="border-2 border-dark py-2"
                            />
                            <Button
                                variant="outline-dark"
                                className="border-2 d-flex align-items-center"
                                onClick={() => console.log('TODO: AI nazwa')}
                                title="Generuj przez AI"
                            >
                                <Stars size={18} />
                            </Button>
                        </InputGroup>
                    </Card.Body>
                </Card>

                {/* Ilość */}
                <Card className="shadow-sm mb-3">
                    <Card.Body className="py-3 px-3">
                        <div className="d-flex align-items-center gap-2">
                            <span className="fw-semibold text-nowrap">Ilość:</span>
                            <Form.Control
                                type="number"
                                min={0}
                                value={quantity}
                                onChange={e => setQuantity(Number(e.target.value))}
                                className="border-2 border-dark py-2 text-end"
                                style={{ maxWidth: 90 }}
                            />
                            <span className="text-muted fw-semibold">szt.</span>
                            <Button
                                variant="outline-dark"
                                className="border-2 d-flex align-items-center ms-auto"
                                onClick={() => console.log('TODO: AI ilosc')}
                                title="Generuj przez AI"
                            >
                                <Stars size={18} />
                            </Button>
                        </div>
                    </Card.Body>
                </Card>

                {/* Pojemność */}
                <Card className="shadow-sm mb-3">
                    <Card.Body className="py-3 px-3">
                        <div className="d-flex align-items-center gap-2">
                            <span className="fw-semibold text-nowrap">Pojemność:</span>
                            <Form.Control
                                type="number"
                                min={0}
                                value={capacity}
                                onChange={e => setCapacity(Number(e.target.value))}
                                className="border-2 border-dark py-2 text-end"
                                style={{ maxWidth: 90 }}
                            />
                            <Form.Select
                                value={unit}
                                onChange={e => setUnit(e.target.value)}
                                className="border-2 border-dark py-2"
                                style={{ maxWidth: 90 }}
                            >
                                {UNITS.map(u => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </Form.Select>
                            <Button
                                variant="outline-dark"
                                className="border-2 d-flex align-items-center ms-auto"
                                onClick={() => console.log('TODO: AI pojemnosc')}
                                title="Generuj przez AI"
                            >
                                <Stars size={18} />
                            </Button>
                        </div>
                    </Card.Body>
                </Card>

                {/* Tagi */}
                <Card className="shadow-sm mb-3">
                    <Card.Body className="py-3 px-3">
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <span className="fw-semibold text-nowrap">Tagi:</span>
                            <InputGroup>
                                <Form.Control
                                    type="text"
                                    placeholder="szukaj..."
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={handleAddTag}
                                    className="border-2 border-dark py-2"
                                />
                                <Button variant="outline-dark" className="border-2 d-flex align-items-center">
                                    <Search size={16} />
                                </Button>
                            </InputGroup>
                            <Button
                                variant="outline-dark"
                                className="border-2 d-flex align-items-center flex-shrink-0"
                                onClick={() => console.log('TODO: AI tagi')}
                                title="Generuj przez AI"
                            >
                                <Stars size={18} />
                            </Button>
                        </div>
                        {tags.length > 0 && (
                            <div className="d-flex flex-wrap gap-1 mt-1">
                                {tags.map(tag => (
                                    <span
                                        key={tag}
                                        className="badge bg-secondary fw-normal d-flex align-items-center gap-1"
                                        style={{ fontSize: '0.85rem', cursor: 'pointer' }}
                                        onClick={() => handleRemoveTag(tag)}
                                    >
                                        × {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                        <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                            Wpisz tag i naciśnij Enter lub przecinek
                        </div>
                    </Card.Body>
                </Card>

                {/* Data ważności */}
                <Card className="shadow-sm mb-3">
                    <Card.Body className="py-3 px-3">
                        <span className="fw-semibold text-nowrap">Data przydatności:</span>
                        <InputGroup>
                            <Form.Control
                                type="date"
                                value={expirationDate}
                                onChange={e => setExpirationDate(e.target.value)}
                                className="border-2 border-dark py-2"
                            />
                        </InputGroup>
                    </Card.Body>
                </Card>

                {/* Opis */}
                <Card className="shadow-sm mb-3">
                    <Card.Body className="py-3 px-3">
                        <div className="d-flex align-items-start gap-2">
                            <span className="fw-semibold text-nowrap pt-2">Opis:</span>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="Tu wpisz dowolne informacje, jeśli chcesz..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="border-2 border-dark py-2 flex-grow-1"
                            />
                            <Button
                                variant="outline-dark"
                                className="border-2 d-flex align-items-center flex-shrink-0"
                                onClick={() => console.log('TODO: AI opis')}
                                title="Generuj przez AI"
                            >
                                <Stars size={18} />
                            </Button>
                        </div>
                    </Card.Body>
                </Card>

                {error && (
                    <Alert variant="danger" className="mb-3" style={{ fontSize: '0.85rem' }}>
                        {error}
                    </Alert>
                )}

                {/* Przyciski */}
                <div className="d-flex gap-2">
                    <Button
                        variant="outline-dark"
                        className="flex-grow-1 border-2 fw-semibold py-2"
                        onClick={() => navigate(`/containers/${containerId}`)}
                    >
                        Anuluj
                    </Button>
                    <Button
                        variant="outline-dark"
                        className="flex-grow-1 border-2 fw-semibold py-2"
                        disabled={!isFormValid || loading}
                        onClick={handleSubmit}
                    >
                        {loading ? 'Zapisywanie...' : 'Zapisz'}
                    </Button>
                </div>

            </Container>
        </>
    );
};

export default EditProduct;