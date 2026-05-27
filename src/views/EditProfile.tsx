import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Container, Card, Form, InputGroup, Button, Row, Col } from 'react-bootstrap';
import { Eye, EyeSlash, PersonFill, LockFill, PersonCircle, PencilFill, XLg } from 'react-bootstrap-icons';
import { getUser, saveUser } from '../Storage';
import Drawer from './components/Drawer';
import Header from './components/Header';
import { apiFetch } from '../api';

const EditProfile: React.FC = () => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [login, setLogin] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [profilePictureUrl, setProfilePictureUrl] = useState('');
    const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const galleryButtonRef = React.useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const user = getUser();
        if (user) {
            setLogin(user.login || '');
            setEmail(user.email || '');
            setPhoneNumber(user.phoneNumber || '');
            setFirstName(user.firstName || '');
            setLastName(user.lastName || '');
            setProfilePictureUrl(user.profileUrl || '');
        }
    }, []);

    const isFormValid = email && phoneNumber && firstName && lastName;

    const dataValidation = (): boolean => {
        // Ulepszony regex dla adresów email
        // Wymusza format: nazwa@domena.rozszerzenie (np. test.123@example.com)
        // Rozszerzenie po kropce musi mieć 2 lub więcej liter.
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            setError('Niepoprawny email!');
            return false;
        }

        if (password) {
            if (password !== confirmPassword) {
                setError('Hasła nie są takie same!');
                return false;
            }
            if (password.length < 8) {
                setError('Hasło musi mieć minimum 8 znaków!');
                return false;
            }
            if (!/[A-Z]/.test(password)) {
                setError('Hasło musi zawierać minimum 1 wielką literę!');
                return false;
            }
            if (!/[a-z]/.test(password)) {
                setError('Hasło musi zawierać minimum 1 małą literę!');
                return false;
            }
            if (!/[0-9]/.test(password)) {
                setError('Hasło musi zawierać minimum jedną cyfrę!');
                return false;
            }
            if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
                setError('Hasło musi zawierać minimum jeden znak specjalny!');
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async () => {
        // Reset błędu przed każdą próbą zapisu
        setError(null);

        if (!dataValidation()) return;
        setLoading(true);

        const user = getUser();
        if (!user?.id) {
            setError('Błąd: brak danych użytkownika.');
            setLoading(false);
            return;
        }

        try {
            const fieldsToUpdate: { fieldName: string; fieldValue: string }[] = [];

            if (email !== (user.email || ''))
                fieldsToUpdate.push({ fieldName: 'email', fieldValue: email });
            if (firstName !== (user.firstName || ''))
                fieldsToUpdate.push({ fieldName: 'firstname', fieldValue: firstName });
            if (lastName !== (user.lastName || ''))
                fieldsToUpdate.push({ fieldName: 'lastname', fieldValue: lastName });
            if (phoneNumber !== (user.phoneNumber || ''))
                fieldsToUpdate.push({ fieldName: 'phonenumber', fieldValue: phoneNumber });

            // Wysyłamy każde pole osobno — zapisujemy usera tylko raz po ostatnim requescie
            let updatedUser = user;
            for (const field of fieldsToUpdate) {
                const res = await apiFetch(`/api/users/credentials/${user.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(field),
                });
                const data = await res.json();
                if (data.status !== 0) {
                    setError(`Błąd przy zmianie ${field.fieldName}: ${data.message}`);
                    return;
                }
                // ostatnia wersja z api
                updatedUser = data.user;
            }

            // Jeśli użytkownik zmienił zdjęcie profilowe, wysyłamy je osobno
            if (profilePictureFile){
                const formData = new FormData();
                formData.append('File', profilePictureFile);
                const res = await apiFetch(`/api/users/upload/${user.id}`, {
                    method: 'PUT',
                    body: formData,
                }, null);
                const data = await res.json();
                if (data.status !== 0) {
                    setError(`Błąd przy zmianie zdjęcia profilowego: ${data.message}`);
                    return;
                }
                updatedUser = data.user;
            }

            // Zapisujemy do storage raz — po wszystkich zmianach danych
            if (fieldsToUpdate.length > 0 || profilePictureFile) {
                saveUser(updatedUser);
            }

            if (password) {
                const res = await apiFetch(`/api/users/password/${user.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ newPassword: password }),
                });
                const data = await res.json();
                if (data.status !== 0) {
                    setError(`Błąd zmiany hasła: ${data.message}`);
                    return;
                }
                // Przy zmianie hasła API zwraca zaktualizowanego usera —
                // zapisujemy tylko pola które faktycznie nas interesują (bez passwordHash)
                const { passwordHash: _omit, ...safeUser } = data.user;
                saveUser(safeUser);
            }

            navigate('/profile');
        } catch {
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
        setProfilePictureUrl(URL.createObjectURL(file));
        setProfilePictureFile(file);
    };

    return (
        <>
            <Drawer open={drawerOpen} setOpen={setDrawerOpen} />

            <Header
                title="Edytuj Profil"
                onMenuClick={() => setDrawerOpen(true)}
                rightElement={null}
            />

            <Container className="py-4 d-flex flex-column align-items-center">
                {/* Zdjęcie profilowe */}
                <div className="position-relative mx-auto" style={{width: 160, height: 160}}>
                    {profilePictureUrl ? (
                        <img
                            src={profilePictureUrl}
                            alt="Zdjęcie profilowe"
                            className="rounded-circle mb-3"
                            style={{ width: 144, height: 144, objectFit: 'cover' }}
                        />
                    ) : (
                        <PersonCircle size={144} className="text-secondary mb-3" />
                    )}
                    <button
                        className="btn btn-dark rounded-circle d-flex align-items-center justify-content-center position-absolute translate-middle"
                        style={{ width: 36, height: 36, bottom: 0, right: 0}}
                        onClick={() => galleryButtonRef.current?.click()}
                    >
                        <input
                            ref={galleryButtonRef}
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={handlePhotoChange}
                        />
                        <PencilFill size={16} />
                    </button>
                    {profilePictureUrl && (
                        <button
                            className="btn btn-danger rounded-circle d-flex align-items-center justify-content-center position-absolute translate-middle"
                            style={{ width: 36, height: 36, top: 8, right: 0 }}
                            onClick={() => {
                                setProfilePictureUrl('');
                                setProfilePictureFile(null);
                            }}
                        >
                            <XLg size={16}/>
                        </button>
                    )}
                </div>

                {/* Sekcja: Dane */}
                <Card className="shadow-sm mb-3">
                    <Card.Body className="py-3 px-3">
                        <div className="d-flex align-items-center gap-2 mb-3">
                            <PersonFill size={18} className="text-secondary" />
                            <p className="small fw-semibold text-uppercase text-muted mb-0">Dane</p>
                        </div>

                        <Row className="mb-3 g-2">
                            <Col>
                                <Form.Control
                                    type="text"
                                    placeholder="Imię"
                                    value={firstName}
                                    onChange={e => setFirstName(e.target.value.replace(/\s/g, ''))}
                                    autoComplete="given-name"
                                    className="border-2 border-dark py-2"
                                    maxLength={50}
                                />
                            </Col>
                            <Col>
                                <Form.Control
                                    type="text"
                                    placeholder="Nazwisko"
                                    value={lastName}
                                    onChange={e => setLastName(e.target.value.replace(/\s/g, ''))}
                                    autoComplete="family-name"
                                    className="border-2 border-dark py-2"
                                    maxLength={50}
                                />
                            </Col>
                        </Row>

                        <Form.Control
                            type="text"
                            placeholder="Login"
                            value={login}
                            disabled
                            autoComplete="username"
                            className="border-2 border-dark py-2 mb-3"
                        />

                        <Form.Control
                            type="email"
                            placeholder="E-mail"
                            value={email}
                            onChange={e => setEmail(e.target.value.replace(/\s/g, ''))}
                            autoComplete="email"
                            className="border-2 border-dark py-2 mb-3"
                            maxLength={254}
                        />

                        <Form.Control
                            type="tel"
                            placeholder="Numer telefonu"
                            value={phoneNumber}
                            onChange={e => setPhoneNumber(e.target.value.replace(/\s/g, ''))}
                            autoComplete="tel"
                            className="border-2 border-dark py-2"
                            maxLength={20}
                        />
                    </Card.Body>
                </Card>

                {/* Sekcja: Hasło */}
                <Card className="shadow-sm mb-3">
                    <Card.Body className="py-3 px-3">
                        <div className="d-flex align-items-center gap-2 mb-3">
                            <LockFill size={18} className="text-secondary" />
                            <p className="small fw-semibold text-uppercase text-muted mb-0">Zmiana hasła</p>
                        </div>

                        <InputGroup className="mb-1 input-group-password-focus">
                            <Form.Control
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Nowe hasło (opcjonalne)"
                                value={password}
                                onChange={e => setPassword(e.target.value.replace(/\s/g, ''))}
                                autoComplete="new-password"
                                className="border-2 border-dark border-end-0 py-2"
                                maxLength={128}
                            />
                            <Button
                                variant="outline-dark"
                                onClick={() => setShowPassword(v => !v)}
                                aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                                className="border-2 border-start-0 bg-white text-secondary"
                            >
                                {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                            </Button>
                        </InputGroup>
                        <p className="text-muted mb-3" style={{ fontSize: '0.75rem' }}>
                            Min. 8 znaków, wielka i mała litera, cyfra oraz znak specjalny.
                        </p>

                        <InputGroup className="mb-1 input-group-password-focus">
                            <Form.Control
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Powtórz nowe hasło"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value.replace(/\s/g, ''))}
                                autoComplete="new-password"
                                className="border-2 border-dark border-end-0 py-2"
                                maxLength={128}
                            />
                            <Button
                                variant="outline-dark"
                                onClick={() => setShowPassword(v => !v)}
                                aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                                className="border-2 border-start-0 bg-white text-secondary"
                            >
                                {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                            </Button>
                        </InputGroup>
                        <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>
                            Hasła muszą być identyczne.
                        </p>
                    </Card.Body>
                </Card>

                {error && (
                    <div className="alert alert-danger text-start py-2 mb-3" role="alert" style={{ fontSize: '0.85rem' }}>
                        {error}
                    </div>
                )}

                <div className="d-flex gap-2">
                    <Button
                        variant="outline-dark"
                        className="flex-grow-1 border-2 fw-semibold py-2"
                        onClick={() => navigate('/profile')}
                    >
                        Anuluj
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!isFormValid || loading}
                        variant="outline-dark"
                        className="flex-grow-1 border-2 fw-semibold py-2"
                    >
                        {loading ? 'Zapisywanie...' : 'Zapisz'}
                    </Button>
                </div>

            </Container>
        </>
    );
};

export default EditProfile;