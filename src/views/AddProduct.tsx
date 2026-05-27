import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Container, Card, Form, InputGroup, Button, Alert } from 'react-bootstrap';
import { CameraFill, PencilFill, Stars, PlusLg, UpcScan } from 'react-bootstrap-icons';
import Drawer from './components/Drawer';
import Header from './components/Header';
import { addProductToContainer, getStoredContainers, getUser } from '../Storage';
import { apiFetch } from '../api.ts';
import { getUserRole, canPerformAction } from './types/models';

const UNITS = ['szt.', 'kg', 'g', 'l', 'ml', 'op.'];

const AddProduct: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const initialName = location.state?.name as string | undefined;
    const initialCapacity = location.state?.capacity as number | undefined;
    const initialUnit = location.state?.unit as string | undefined;
    const initialImageUrl = location.state?.imageUrl as string | undefined;

    const { id: containerId } = useParams<{ id: string }>();

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [name, setName] = useState(decodeURIComponent(initialName || ''));
    const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl || null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [expirationDate, setExpirationDate] = useState('');
    const [quantity, setQuantity] = useState<string>('1');
    const [capacity, setCapacity] = useState<string>(String(initialCapacity || 1));
    const [unit, setUnit] = useState<string>(initialUnit || 'szt.');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [permissionError, setPermissionError] = useState<string | null>(null);

    const galleryButtonRef = React.useRef<HTMLInputElement | null>(null);

    const currentUser = getUser();

    // Sprawdź uprawnienia — editor i wyżej mogą dodawać produkty
    const container = getStoredContainers().find(c => c.id === containerId);
    const role = getUserRole(container ?? {}, currentUser?.id ?? '');
    const canEdit = canPerformAction(role, 'Editor');

    const isFormValid = name.trim().length > 0 && !!containerId && canEdit;

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

    const handleAddTagButton = () => {
        const newTag = tagInput.trim().replace(/,$/, '');
        if (newTag && !tags.includes(newTag)) {
            setTags(prev => [...prev, newTag]);
        }
        setTagInput('');
    };

    const handleSubmit = async () => {
        if (!containerId) {
            setError('Błąd: brak id kontenera.');
            return;
        }

        if (!canEdit) {
            setPermissionError('Potrzebujesz wyższych uprawnień, aby dodawać produkty.');
            return;
        }

        setLoading(true);
        setError(null);
        setPermissionError(null);

        try {
            const formData = new FormData();
            formData.append("containerId", containerId);
            formData.append("productName", name);
            formData.append("quantity", String(Math.max(0, Number(quantity) || 0)));
            formData.append("unit", unit);
            if (capacity) formData.append("capacity", String(Math.max(0, Number(capacity) || 0)));
            if (description.trim()) formData.append("description", description.trim());
            if (tags.length > 0) formData.append("tags", JSON.stringify(tags));
            if (expirationDate) formData.append("expirationDate", new Date(expirationDate).toISOString());
            if (imageFile) formData.append("image", imageFile);

            const res = await apiFetch(`/api/Products/add`, {
                method: 'POST',
                body: formData
            }, null);

            if (res.status === 403) {
                setPermissionError('Potrzebujesz wyższych uprawnień, aby dodawać produkty.');
                return;
            }

            const data = await res.json();

            if (data.status !== 0) {
                setError(`Błąd: ${data.message}`);
                return;
            }

            addProductToContainer(containerId, data.product);
            navigate(`/containers/${containerId}`, { replace: true });
        } catch (err) {
            console.error('Błąd:', err);
            setError('Błąd połączenia z serwerem.');
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file?.type.startsWith('image/')) return;
        if (file.size > 5 * 1024 * 1024) return;
        setImageUrl(URL.createObjectURL(file));
        setImageFile(file);
    };

    useEffect(() => {
        const fetchImage = async () => {
            const res = await fetch(imageUrl!);
            const blob = await res.blob();
            const file = new File([blob], 'image.jpg', { type: blob.type });
            return file;
        };

        if (imageUrl != null && imageFile == null) {
            fetchImage().then(file => setImageFile(file)).catch(err => {
                console.error('Błąd pobierania obrazu:', err);
                setImageUrl(null);
            });
        }

        return () => {
            if (imageUrl) URL.revokeObjectURL(imageUrl);
        };
    }, [imageUrl]);

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

                {!canEdit && (
                    <Alert variant="warning" className="mb-3" style={{ fontSize: '0.9rem' }}>
                        🔒 Nie masz uprawnień do dodawania produktów w tym kontenerze. Wymagana rola: <strong>editor</strong> lub wyższa.
                    </Alert>
                )}

                {permissionError && (
                    <Alert variant="danger" className="mb-3" style={{ fontSize: '0.85rem' }}>
                        🔒 {permissionError}
                    </Alert>
                )}

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
                                {imageUrl && (
                                    <img src={imageUrl} alt="Zdjęcie produktu"
                                    className="position-absolute w-100 h-100 object-fit-cover rounded"
                                    style={{border: '2px solid #ccc' }}/>
                                )}
                            </div>
                            <button
                                className="btn btn-dark rounded-circle d-flex align-items-center justify-content-center position-absolute"
                                style={{ width: 36, height: 36, bottom: -8, left: -8 }}
                                onClick={() => console.log('TODO: aparat')}
                                disabled={!canEdit}
                            >
                                <CameraFill size={16} />
                            </button>
                            <button
                                className="btn btn-dark rounded-circle d-flex align-items-center justify-content-center position-absolute"
                                style={{ width: 36, height: 36, bottom: -8, right: -8 }}
                                onClick={() => galleryButtonRef.current?.click()}
                                disabled={!canEdit}
                            >
                                <input
                                    ref={galleryButtonRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    style={{ display: "none" }}
                                />
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
                                disabled={!canEdit}
                                maxLength={100}
                            />
                            <Button
                                variant="outline-dark"
                                className="border-2 d-flex align-items-center"
                                onClick={() => console.log('TODO: AI nazwa')}
                                title="Generuj przez AI"
                                disabled={!canEdit}
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
                                onChange={e => setQuantity(e.target.value)}
                                className="border-2 border-dark py-2 text-end"
                                style={{ maxWidth: 90 }}
                                disabled={!canEdit}
                            />
                            <span className="text-muted fw-semibold">szt.</span>
                            <Button
                                variant="outline-dark"
                                className="border-2 d-flex align-items-center ms-auto"
                                onClick={() => console.log('TODO: AI ilosc')}
                                title="Generuj przez AI"
                                disabled={!canEdit}
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
                                onChange={e => setCapacity(e.target.value)}
                                className="border-2 border-dark py-2 text-end"
                                style={{ maxWidth: 90 }}
                                disabled={!canEdit}
                            />
                            <Form.Select
                                value={unit}
                                onChange={e => setUnit(e.target.value)}
                                className="border-2 border-dark py-2"
                                style={{ maxWidth: 90 }}
                                disabled={!canEdit}
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
                                disabled={!canEdit}
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
                            <InputGroup className="input-group-password-focus">
                                <Form.Control
                                    type="text"
                                    placeholder="szukaj..."
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={handleAddTag}
                                    className="border-2 border-dark py-2"
                                    disabled={!canEdit || tags.length >= 20}
                                    maxLength={30}
                                />
                                <Button variant="outline-dark" className="border-2 d-flex align-items-center" disabled={!canEdit || !tagInput.trim() || tags.length >= 20} onClick={handleAddTagButton}>
                                    <PlusLg size={16} />
                                </Button>
                            </InputGroup>
                            <Button
                                variant="outline-dark"
                                className="border-2 d-flex align-items-center flex-shrink-0"
                                onClick={() => console.log('TODO: AI tagi')}
                                title="Generuj przez AI"
                                disabled={!canEdit}
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
                                        style={{ fontSize: '0.85rem', cursor: canEdit ? 'pointer' : 'default' }}
                                        onClick={() => canEdit && handleRemoveTag(tag)}
                                    >
                                        {canEdit && '× '}{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                        <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                            Wpisz tag i naciśnij Enter, przecinek lub +{tags.length > 0 && ` (${tags.length}/20)`}
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
                                disabled={!canEdit}
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
                                disabled={!canEdit}
                                maxLength={1000}
                            />
                            <Button
                                variant="outline-dark"
                                className="border-2 d-flex align-items-center flex-shrink-0"
                                onClick={() => console.log('TODO: AI opis')}
                                title="Generuj przez AI"
                                disabled={!canEdit}
                            >
                                <Stars size={18} />
                            </Button>
                        </div>
                        {canEdit && (
                            <div className="text-muted text-end mt-1" style={{ fontSize: '0.75rem' }}>
                                {description.length}/1000
                            </div>
                        )}
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
                    {canEdit && (
                        <Button
                            variant="outline-dark"
                            className="flex-grow-1 border-2 fw-semibold py-2"
                            disabled={!isFormValid || loading}
                            onClick={handleSubmit}
                        >
                            {loading ? 'Zapisywanie...' : 'Gotowe!'}
                        </Button>
                    )}
                </div>

            </Container>
        </>
    );
};

export default AddProduct;