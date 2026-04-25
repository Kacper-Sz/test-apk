import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Form, InputGroup, Button, Row, Col } from 'react-bootstrap';
import { Eye, EyeSlash } from 'react-bootstrap-icons';
import { saveUser, saveTokens } from '../Storage';
import LoadingSpinner from './components/Spinner';

const Register: React.FC = () => {
    const [login, setLogin] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async () => {
        setError(null);
        if (dataValidation()) {
            setIsLoading(true);
            try {
                const response = await fetch('https://carton-api-dev-dkawh3e2cjbhanen.swedencentral-01.azurewebsites.net/api/users/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ login, password, email, phoneNumber, firstName, lastName })
                });

                const data = await response.json();

                if (!response.ok) {
                    if (data.status === 80) {
                        setError('Użytkownik z tym loginem lub emailem już istnieje');
                    } else {
                        setError('Rejestracja nie powiodła się');
                    }
                    return;
                }

                saveUser(data.user);
                saveTokens(data.tokens);
                navigate('/containers');
            } catch (err) {
                setError('Błąd sieci, spróbuj ponownie');
                console.error('Registration error:', err);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const dataValidation = (): boolean => {

        // TODO ZMIENIC REGEXA ZEBY BYL DOKLADNIEJSZY
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            setError('Niepoprawnt email!');
            return false;
        }
        else if (password !== confirmPassword) {
            setError('Hasła nie są takie same!');
            return false;
        }
        else if(password.length < 8) {
            setError('Hasło musi mieć minimum 8 znaków!');
            return false;
        }
        else if (!/[A-Z]/.test(password)) {
            setError('Hasło musi zawierać minimum 1 wielką literę!');
            return false;
        }
        else if (!/[a-z]/.test(password)) {
            setError('Hasło musi zawierać minimum 1 małą literę!');
            return false;
        }
        else if (!/[0-9]/.test(password)) {
            setError('Hasło musi zawierać minimum jedną cyfrę!');
            return false;
        }
        else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            setError('Hasło musi zawierać minimum jeden znak specjalny!');
            return false;
        }
        return true;

    }

    const isFormValid = login && email && password && confirmPassword && phoneNumber && firstName && lastName;

    if (isLoading) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center bg-white">
                <LoadingSpinner message="Rejestracja..." variant="secondary" />
            </div>
        );
    }

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-white py-5">
            <div className="w-100 px-4 text-center" style={{ maxWidth: 340 }}>

                {/* Tytuł */}
                <h1 className="fw-bold mb-4">Rejestracja</h1>

                {/* Imię i Nazwisko */}
                <Row className="mb-3 g-2 text-start">
                    <Col>
                        <Form.Control
                            type="text"
                            placeholder="Imię"
                            value={firstName}
                            onChange={e => setFirstName(e.target.value)}
                            autoComplete="given-name"
                            className="border-2 border-dark py-2"
                        />
                    </Col>
                    <Col>
                        <Form.Control
                            type="text"
                            placeholder="Nazwisko"
                            value={lastName}
                            onChange={e => setLastName(e.target.value)}
                            autoComplete="family-name"
                            className="border-2 border-dark py-2"
                        />
                    </Col>
                </Row>

                {/* Login */}
                <Form.Group className="mb-3 text-start">
                    <Form.Control
                        type="text"
                        placeholder="Login"
                        value={login}
                        onChange={e => setLogin(e.target.value)}
                        autoComplete="username"
                        className="border-2 border-dark py-2"
                    />
                </Form.Group>

                {/* E-mail */}
                <Form.Group className="mb-3 text-start">
                    <Form.Control
                        type="email"
                        placeholder="E-mail"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        autoComplete="email"
                        className="border-2 border-dark py-2"
                    />
                </Form.Group>

                {/* Telefon */}
                <Form.Group className="mb-3 text-start">
                    <Form.Control
                        type="tel"
                        placeholder="Numer telefonu"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        autoComplete="tel"
                        className="border-2 border-dark py-2"
                    />
                </Form.Group>

                {/* Hasło */}
                <Form.Group className="mb-1 text-start">
                    <InputGroup>
                        <Form.Control
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Hasło"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete="new-password"
                            className="border-2 border-dark border-end-0 py-2"
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
                </Form.Group>
                <p className="text-muted text-start mb-3" style={{ fontSize: '0.75rem' }}>
                    Min. 8 znaków, wielka i mała litera, cyfra oraz znak specjalny.
                </p>

                {/* Powtórz hasło */}
                <Form.Group className="mb-1 text-start">
                    <InputGroup>
                        <Form.Control
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Powtórz hasło"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            autoComplete="new-password"
                            className="border-2 border-dark border-end-0 py-2"
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
                </Form.Group>
                <p className="text-muted text-start mb-4" style={{ fontSize: '0.75rem' }}>
                    Hasła muszą być identyczne.
                </p>

                {/* Błąd */}
                {error && (
                    <div className="alert alert-danger text-start py-2 mb-3" role="alert" style={{ fontSize: '0.85rem' }}>
                        {error}
                    </div>
                )}

                {/* Przycisk Zarejestruj */}
                <Button
                    onClick={handleSubmit}
                    disabled={!isFormValid}
                    variant="outline-dark"
                    className="w-100 mb-4 border-2 fw-semibold py-2"
                >
                    Zarejestruj się
                </Button>

                {/* Masz już konto */}
                <Button
                    variant="link"
                    onClick={() => navigate('/login')}
                    className="p-0 text-dark fw-semibold text-decoration-underline"
                >
                    Mam już konto
                </Button>

            </div>
        </div>
    );
};

export default Register;