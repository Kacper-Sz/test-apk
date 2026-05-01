import React, {  useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Container, Card, Form, InputGroup, Button, Alert } from 'react-bootstrap';
import { CameraFill, PencilFill, Stars, Search, UpcScan } from 'react-bootstrap-icons';
import Drawer from './components/Drawer';
import Header from './components/Header';
import { addProductToContainer } from '../Storage';
import { apiFetch } from '../api.ts';

const UNITS = ['szt.', 'kg', 'g', 'l', 'ml', 'op.'];

const AddProduct: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const initialName = location.state?.name as string | undefined;
    const initialCapacity = location.state?.capacity as number | undefined;
    const initialUnit = location.state?.unit as string | undefined;

    const { id: containerId } = useParams<{ id: string }>();

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [name, setName] = useState(decodeURIComponent(initialName || ''));
    const [expirationDate, setExpirationDate] = useState('');
    const [quantity, setQuantity] = useState<number>(1);
    const [capacity, setCapacity] = useState<number>(initialCapacity || 1);
    const [unit, setUnit] = useState<string>(initialUnit || 'szt.');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isFormValid = name.trim().length > 0 && !!containerId;

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
        if (!containerId) {
            setError('Błąd: brak id kontenera.');
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const res = await apiFetch(`/api/Products/add`, {
                method: 'POST',
                body: JSON.stringify({
                    containerId: containerId,
                    productName: name,
                    quantity: quantity,
                    capacity: capacity,
                    unit: unit,
                    description: description.trim() || null,
                    tags: tags.length > 0 ? tags : null,
                    expirationDate: expirationDate ? new Date(expirationDate).toISOString() : null,
                }),
            });

            const data = await res.json();

            if (data.status !== 0) {
                setError(`Błąd: ${data.message}`);
                return;
            }

            addProductToContainer(containerId, data.product);

            navigate(`/containers/${containerId}`);
        } catch (err) {
            console.error('Błąd:', err);
            setError('Błąd połączenia z serwerem.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Drawer open={drawerOpen} setOpen={setDrawerOpen} />

            <Header
                title="Dodaj nowy produkt..."
                onMenuClick={() => setDrawerOpen(true)}
                rightElement={
                    <button className="btn btn-link p-0 text-body" onClick={() => navigate(`/containers/${containerId}/add-product/barcode`)}>
                        <UpcScan size={28} />
                    </button>
                }
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
                                onClick={() => console.log('TODO: galeria/edytuj')}
                            >
                                <PencilFill size={16} />
                            </button>
                        </div>
                    </Card.Body>
                </Card>

                {/* Nazwa */}
                <Card className="shadow-sm mb-3">
                    <Card.Body className="py-3 px-3">
                        <span className="fw-semibold text-nowrap">Nazwa produktu:</span>
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
                        {loading ? 'Zapisywanie...' : 'Gotowe!'}
                    </Button>
                </div>

            </Container>
        </>
    );
};

export default AddProduct;