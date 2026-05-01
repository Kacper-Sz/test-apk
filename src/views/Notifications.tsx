import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Badge } from 'react-bootstrap';
import { PersonPlusFill, BoxSeam, CheckCircleFill, XCircleFill } from 'react-bootstrap-icons';
import Drawer from './components/Drawer';
import Header from './components/Header';
import LoadingSpinner from './components/Spinner';
import { getUser } from '../Storage.tsx';
import { apiFetch } from '../api.ts';
import type { NotificationModel } from "./types/models";

/*
tu trzeba poprawic troche powiadomienia 
ze np uzytkownk X wysyla ci zaproszenie - ale to musze dostac odp od chlopakow
czy api robi to co mysle/ jak bedzie zmienione


a tak to trzeba zrobic odpwoiednia kolejnosc np kontener w obecnym momencie od razu po utowrzniu dodaje ludzi do niego
a jak mamy powiadomienie to musi to sie zadziac po zaakecpotaniwu powiadomienia
*/

const Notifications: React.FC = () => {
    const [notifications, setNotifications] = useState<NotificationModel[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
    const [respondingId, setRespondingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            const user = getUser();
            if (!user?.id) {
                setError('Brak danych użytkownika');
                setLoading(false);
                return;
            }

            try {
                const res = await apiFetch(`/api/notifications/${user.id}`);
                const data = await res.json();
                if (data.status !== 0) {
                    setError(data.message || 'Błąd pobierania powiadomień');
                    return;
                }
                setNotifications(data.notifications || []);
            } catch {
                setError('Błąd połączenia z serwerem.');
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, []);

    const handleRespond = async (notification: NotificationModel, accept: boolean) => {
        setRespondingId(notification.id);
        try {
            const res = await apiFetch(`/api/notifications/friendresponse/${notification.id}`, {
                method: 'PUT',
                body: JSON.stringify({ type: accept ? 0 : 1 }),
            });
            const data = await res.json();
            if (data.status !== 0) {
                alert(`Błąd: ${data.message}`);
                return;
            }
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
        } catch {
            alert('Błąd połączenia z serwerem.');
        } finally {
            setRespondingId(null);
        }
    };

    const getNotificationLabel = (type: 0 | 1) =>
        type === 0 ? 'Zaproszenie do znajomych' : 'Zaproszenie do kontenera';

    const getNotificationIcon = (type: 0 | 1) =>
        type === 0
            ? <PersonPlusFill size={28} className="text-primary" />
            : <BoxSeam size={28} className="text-secondary" />;

    const getBadgeVariant = (type: 0 | 1) =>
        type === 0 ? 'primary' : 'secondary';

    return (
        <div>
            <Drawer open={drawerOpen} setOpen={setDrawerOpen} />

            <Header
                title="Powiadomienia"
                onMenuClick={() => setDrawerOpen(true)}
            />

            <Container className="py-3">

                {loading && <LoadingSpinner message="Ładowanie powiadomień..." />}

                {error && (
                    <Row>
                        <Col>
                            <Alert variant="danger">{error}</Alert>
                        </Col>
                    </Row>
                )}

                {!loading && !error && (
                    <div className="d-flex flex-column gap-2">
                        {notifications.map((notification) => (
                            <Card key={notification.id} className="shadow-sm">
                                <Card.Body className="py-2 px-3">
                                    <div className="d-flex align-items-center gap-3">

                                        {/* Ikona */}
                                        <div
                                            className="d-flex align-items-center justify-content-center flex-shrink-0 rounded bg-secondary-subtle"
                                            style={{ width: 56, height: 56 }}
                                        >
                                            {getNotificationIcon(notification.type)}
                                        </div>

                                        {/* Treść */}
                                        <div className="flex-grow-1">
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="fw-bold">{getNotificationLabel(notification.type)}</span>
                                                <Badge bg={getBadgeVariant(notification.type)} className="fw-normal">
                                                    {notification.type === 0 ? 'Znajomy' : 'Kontener'}
                                                </Badge>
                                            </div>
                                            <div className="small text-muted mt-1">
                                                {new Date(notification.date).toLocaleDateString('pl-PL', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </div>
                                        </div>

                                        {/* Przyciski akcji */}
                                        <div className="d-flex gap-2 flex-shrink-0">
                                            <button
                                                className="btn btn-link p-1 text-success"
                                                title="Zaakceptuj"
                                                disabled={respondingId === notification.id}
                                                onClick={() => handleRespond(notification, true)}
                                            >
                                                <CheckCircleFill size={28} />
                                            </button>
                                            <button
                                                className="btn btn-link p-1 text-danger"
                                                title="Odrzuć"
                                                disabled={respondingId === notification.id}
                                                onClick={() => handleRespond(notification, false)}
                                            >
                                                <XCircleFill size={28} />
                                            </button>
                                        </div>

                                    </div>
                                </Card.Body>
                            </Card>
                        ))}
                    </div>
                )}

                {!loading && !error && notifications.length === 0 && (
                    <Row>
                        <Col>
                            <Alert variant="info">Brak powiadomień</Alert>
                        </Col>
                    </Row>
                )}

            </Container>
        </div>
    );
};

export default Notifications;