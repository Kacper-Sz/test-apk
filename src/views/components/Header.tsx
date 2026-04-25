import React from 'react';
import { Container } from 'react-bootstrap';
import { List } from 'react-bootstrap-icons';

type HeaderProps = {
    title: string;
    onMenuClick: () => void;
    rightElement?: React.ReactNode;
};

const Header: React.FC<HeaderProps> = ({ title, onMenuClick, rightElement }) => {
    return (
        <div
            className="carton-header sticky-top shadow-sm"
            style={{ zIndex: 1020 }}
        >
            <Container fluid>
                <div className="py-2 d-flex align-items-center position-relative">
                    <button
                        className="btn btn-link p-0 text-body"
                        onClick={onMenuClick}
                        aria-label="Otwórz menu"
                    >
                        <List size={28} />
                    </button>
                    <h1 
                        className="fw-bold mb-0 position-absolute start-50 translate-middle-x text-truncate"
                        style={{
                            maxWidth: 'calc(100% - 100px)',
                            fontSize: 'clamp(1rem, 5vw, 1.5rem)'
                        }}
                        title={title}
                    >
                        {title}
                    </h1>
                    <div className="ms-auto">
                        {rightElement}
                    </div>
                </div>
            </Container>
        </div>
    );
};

export default Header;