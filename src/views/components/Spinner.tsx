
import React from 'react';
import { Spinner as BSSpinner, Row, Col } from 'react-bootstrap';

type LoadingSpinnerProps = {
    message?: string;
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
    size?: 'sm' | 'lg';
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    message = 'Ładowanie...',
    variant = 'primary',
    size = 'lg',
}) => {
    return (
        <Row className="justify-content-center align-items-center" style={{ minHeight: '200px' }}>
            <Col xs="auto" className="text-center">
                <BSSpinner
                    animation="border"
                    variant={variant}
                    role="status"
                    style={{
                        width: size === 'lg' ? '3rem' : '2rem',
                        height: size === 'lg' ? '3rem' : '2rem',
                    }}
                >
                    <span className="visually-hidden">Ładowanie...</span>
                </BSSpinner>
                {message && (
                    <div className="mt-3 text-muted">
                        <small>{message}</small>
                    </div>
                )}
            </Col>
        </Row>
    );
};

export default LoadingSpinner;