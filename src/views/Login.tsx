import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Form, InputGroup, Button } from 'react-bootstrap';
import { Eye, EyeSlash } from 'react-bootstrap-icons';
import {saveUser, saveTokens} from '../Storage';
import LoadingSpinner from './components/Spinner';


const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('https://carton-api-dev-dkawh3e2cjbhanen.swedencentral-01.azurewebsites.net/api/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loginOrEmail: email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.log('Blad logowania:', data);
                return;
            }

            saveUser(data.user);
            saveTokens(data.tokens);
            navigate('/containers');
        } catch (err) {
            console.log('Blad sieci:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center bg-white">
                <LoadingSpinner message="Logowanie..." variant="secondary" />
            </div>
        );
    }


    // <img src="src/assets/logo.png" className="img-fluid"/>
    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center">
            <div className="w-100 px-4 text-center" style={{ maxWidth: 320 }}>
                
                <img src="/logo.png" className="img-fluid" alt="logo" />

                {/* Tytuł */}
                <h1 className="fw-bold mb-4">Logowanie</h1>

                {/* Login/Email */}
                <Form.Group className="mb-3 text-start">
                    <Form.Control
                        type="text"
                        placeholder="Login lub E-mail"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        autoComplete="username"
                        className="border-2 border-dark py-2"
                    />
                </Form.Group>

                {/* Hasło */}
                <Form.Group className="mb-2 text-start">
                    <InputGroup>
                        <Form.Control
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Hasło"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete="current-password"
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

                {/* Zapomniałeś hasła */}
                <div className="text-end mb-4">
                    <Button
                        variant="link"
                        size="sm"
                        className="p-0 text-decoration-none text-muted small"
                        onClick={() => console.log('TODO: reset hasła')}
                    >
                        Zapomniałeś hasła?
                    </Button>
                </div>

                {/* Przycisk Zaloguj */}
                <Button
                    onClick={handleSubmit}
                    disabled={!email || !password}
                    variant="outline-dark"
                    className="w-100 mb-4 border-2 fw-semibold py-2"
                >
                    Zaloguj
                </Button>

                {/* Stwórz konto */}
                <Button
                    variant="link"
                    onClick={() => navigate('/register')}
                    className="p-0 text-dark fw-semibold text-decoration-underline"
                >
                    Stwórz konto
                </Button>

            </div>
        </div>
    );
};

export default Login;