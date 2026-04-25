import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Alert, Dropdown, Badge, Collapse } from 'react-bootstrap';
import { PlusCircle, Box, ChevronDown, ChevronUp, ThreeDotsVertical } from 'react-bootstrap-icons';
import type { ContainerModel } from './types/models.ts';
import LoadingSpinner from './components/Spinner';
import Drawer from './components/Drawer';
import Header from './components/Header';
import SearchBar from './components/Searchbar';
import { apiFetch } from '../api.ts';

//import { mockContainers } from '../mockData.ts';
// TODO usunac dane poprzednie te zrobione "na sztywno"
import { getStoredContainers, getUser, saveContainers} from '../Storage.tsx';

const Containers: React.FC = () => {
    const [containers, setContainers] = useState<ContainerModel[]>(getStoredContainers());
    const [loading, setLoading] = useState<boolean>(containers.length === 0);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none');
    const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    // musi byc tak (a nie tak jak w produktach) bo inaczej mozna kilka opcji jednoczesnie
    // otwierac na kilku kontenerach - analogicznie do rozwijania info
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        fetchContainers();
    }, []);

    const fetchContainers = async () => {
        try {
            setLoading(true);
        
            const user = getUser();
            if (!user?.id) {
                setError('Brak danych użytkownika.');
                return;
            }

            const res = await apiFetch(`/api/Containers/containers/${user.id}`, {
                method: 'GET'
            });
        
            const data = await res.json();
        
            if (data.status !== 0) {
                setError(`Błąd: ${data.message}`);
                return;
            }

            saveContainers(data.containers);
            setContainers(data.containers);
            setError(null);
        } catch (err) {
            setError('Błąd połączenia z serwerem.');
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const removeContainer = async (containerId:string) => {
        try {
            const res = await apiFetch(`/api/Containers/delete/${containerId}`, {
                method: 'DELETE',
                body: JSON.stringify({
                    OtherContainerId: null
                }), // TODO TRZEBA DODAC OPCJE WYBORU CZY CALY CZY PRZENIESIENIE
            });

            const data = await res.json();

            if(data.status !== 0) {
                setError(`Błąd: ${data.message}`);
                return;
            }
    

            const updatedContainers = containers.filter(c => c.id !== containerId);
            setContainers(updatedContainers);
            saveContainers(updatedContainers);
            setError(null);
        } catch (err) {
            setError('Błąd połączenia z serwerem.');
            console.error('Error:', err);
        }
    }

    const filteredContainers = containers
        .filter(c => c.containerName?.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            if (sortOrder === 'asc') return (a.containerName || '').localeCompare(b.containerName || '');
            if (sortOrder === 'desc') return (b.containerName || '').localeCompare(a.containerName || '');
            return 0;
        });

    const toggleExpand = (id: string) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    const formatProductCount = (count: number) => {
        if (count === 1) return '1 Produkt';
        if (count >= 2 && count <= 4) return `${count} Produkty`;
        return `${count} Produktów`;
    };

    // TODO 
    // obecnie ustawiam i przekazuje kolor - ale nigdzie go nie uzywam zastanowic sie co z nim robic
    return (
        <>
            <Drawer open={drawerOpen} setOpen={setDrawerOpen} />

            <Header
                title="Kontenery"
                onMenuClick={() => setDrawerOpen(true)}
                rightElement={
                    <button className="btn btn-link p-0 text-body" onClick={() => navigate('/add-container')}>
                        <PlusCircle size={28} />
                    </button>
                }
            />

            <SearchBar
                placeholderText="Szukaj kontenera..."
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
            />

            <Container className="py-3">

                {loading && <LoadingSpinner message="Ładowanie kontenerów..." />}

                {error && (
                    <Row>
                        <Col>
                            <Alert variant="danger">{error}</Alert>
                        </Col>
                    </Row>
                )}

                {!loading && !error && (
                    <div className="d-flex flex-column gap-2">
                        {filteredContainers.map((container) => {
                            const isExpanded = expandedId === container.id;
                            const productCount = container.productList?.length ?? 0;

                            return (
                                <Card
                                    key={container.id}
                                    className="shadow-sm"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => navigate(`/containers/${container.id}`)}
                                >
                                    {/* Główny wiersz */}
                                    <Card.Body className="py-2 px-3">
                                        <div className="d-flex align-items-center gap-3">

                                            {/* Ikona */}
                                            <div
                                                className="d-flex align-items-center justify-content-center flex-shrink-0 rounded bg-secondary-subtle"
                                                style={{ width: 56, height: 56 }}
                                            >
                                                <Box size={28} />
                                            </div>

                                            {/* Nazwa i liczba produktów */}
                                            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                                <div className="fw-bold text-truncate">{container.containerName || 'Brak nazwy'}</div>
                                                <div className="small text-muted">{formatProductCount(productCount)}</div>
                                            </div>

                                            {/* Rozwiń */}
                                            <button
                                                className="btn btn-link p-1 text-secondary"
                                                onClick={(e) => { e.stopPropagation(); toggleExpand(container.id!); }}
                                            >
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </button>

                                            {/* Menu kontekstowe */}
                                            <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <Dropdown
                                                    align="end"
                                                    show={openDropdownId === container.id}
                                                    onToggle={(isOpen) => setOpenDropdownId(isOpen ? container.id! : null)}
                                                >
                                                    <Dropdown.Toggle
                                                        variant="link"
                                                        bsPrefix=" "
                                                        className="p-1 text-secondary border-0 bg-transparent"
                                                    >
                                                        <ThreeDotsVertical size={20} />
                                                    </Dropdown.Toggle>
                                                    <Dropdown.Menu>
                                                        <Dropdown.Item onClick={() => navigate(`/containers/${container.id}/edit-container`)}>
                                                            Edytuj
                                                        </Dropdown.Item>
                                                        <Dropdown.Item onClick={() => removeContainer(container.id!)} className="text-danger">
                                                            Usuń
                                                        </Dropdown.Item>
                                                    </Dropdown.Menu>
                                                </Dropdown>
                                            </div>
                                        </div>
                                    </Card.Body>

                                    {/* Rozwinięta sekcja */}
                                    <Collapse in={isExpanded}>
                                        <div>
                                            <Card.Body className="pt-3 px-3 pb-3 border-top">
                                                {/* Pełna nazwa */}
                                                <p className="fw-bold mb-2">{container.containerName || 'Brak nazwy'}</p>
                                                                
                                                {/* Opis */}
                                                {container.description && (
                                                    <p className="small text-muted mb-2">{container.description}</p>
                                                )}

                                                {/* Tagi */}
                                                {container.tags && container.tags.length > 0 && (
                                                    <div className="d-flex flex-wrap gap-1 mb-2">
                                                        {container.tags.map((tag, index) => (
                                                            <Badge key={index} bg="secondary" className="fw-normal">{tag}</Badge>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Info o dostępie */}
                                                <div className="small text-muted">
                                                    {container.isForMoreUsers
                                                        ? `Współdzielony z ${container.userList?.length ?? 0} użytkownikami`
                                                        : 'Tylko Twój kontener'
                                                    }
                                                </div>
                                            </Card.Body>
                                        </div>
                                    </Collapse>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {!loading && !error && filteredContainers.length === 0 && (
                    <Row>
                        <Col>
                            <Alert variant="info">
                                {searchTerm ? 'Brak kontenerów spełniających kryteria wyszukiwania' : 'Brak kontenerów'}
                            </Alert>
                        </Col>
                    </Row>
                )}

            </Container>
        </>
    );
};

export default Containers;