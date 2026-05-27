import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Alert, Badge } from 'react-bootstrap';
import { PersonPlusFill, BoxSeam, CheckCircleFill, XCircleFill, ArrowClockwise, ExclamationTriangleFill, ClockFill, ArrowRightCircleFill } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import Drawer from './components/Drawer';
import Header from './components/Header';
import LoadingSpinner from './components/Spinner';
import { getUser } from '../Storage.tsx';
import { apiFetch } from '../api.ts';
import type { NotificationModel } from "./types/models";

const parsePolishDate = (dateStr: string): Date | null => {
    const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
    if (!match) return null;

    const [, day, month, year] = match;
    const parsedDate = new Date(`${year}-${month}-${day}`);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const Notifications: React.FC = () => {
    const [notifications, setNotifications] = useState<NotificationModel[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
    const [respondingId, setRespondingId] = useState<string | null>(null);
    const navigate = useNavigate();

    const fetchNotifications = useCallback(async (showFullLoader = false) => {
        const user = getUser();
        if (!user?.id) {
            setError('Brak danych użytkownika');
            setLoading(false);
            return;
        }

        if (showFullLoader) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }
        setError(null);

        try {
            const res = await apiFetch(`/api/notifications/${user.id}`);
            const data = await res.json();
            if (data.status !== 0) {
                setError(data.message || 'Błąd pobierania powiadomień');
                return;
            }

            const fetchedNotifications: NotificationModel[] = data.notifications || [];
            setNotifications(fetchedNotifications);
        } catch {
            setError('Błąd połączenia z serwerem.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications(true);
    }, [fetchNotifications]);

    const handleRespond = async (notification: NotificationModel, accept: boolean) => {
        setRespondingId(notification.id);
        try {
            const res = await apiFetch(`/api/notifications/friendOrExpirationDateResponse/${notification.id}`, {
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

    const getNotificationContent = (notification: NotificationModel): string => {
        const info = notification.information || '';
        const parseInfo = (str: string) => {
            const result: Record<string, string> = {};
            const keys = ['ContainerName', 'SenderLogin', 'SenderFirstName', 'SenderLastName', 'Product', 'ContainerId', 'ExpirationDate'];
            keys.forEach(key => {
                const searchStr = `${key}: `;
                const startIdx = str.indexOf(searchStr);
                if (startIdx !== -1) {
                    let valueStr = str.substring(startIdx + searchStr.length);
                    let endIdx = valueStr.indexOf(';');
                    keys.forEach(k => {
                        if (k !== key) {
                            const kIdx = valueStr.indexOf(`${k}: `);
                            if (kIdx !== -1 && (endIdx === -1 || kIdx < endIdx)) {
                                endIdx = kIdx;
                            }
                        }
                    });
                    if (endIdx !== -1) {
                        valueStr = valueStr.substring(0, endIdx);
                    }
                    result[key] = valueStr.trim();
                }
            });
            return result;
        };

        const parsed = parseInfo(info);

        switch (notification.type) {
            case 0: {
                const nick = parsed['SenderLogin'] || 'nieznanego użytkownika';
                return `Zaproszenie od użytkownika ${nick}`;
            }
            case 1: {
                const containerName = parsed['ContainerName'] || 'nieznanego kontenera';
                const role = notification.role || 'nieznana';
                const sender = parsed['SenderLogin'] || 'kogoś';
                return `Zostałeś zaproszony do kontenera „${containerName}" jako ${role} przez użytkownika ${sender}`;
            }
            case 2: {
                const productName = parsed['Product'] || notification.content;
                const expiration = parsed['ExpirationDate']
                    ? (() => {
                        const parsedDate = parsePolishDate(parsed['ExpirationDate']);
                        return parsedDate ? parsedDate.toLocaleDateString('pl-PL') : '';
                    })()
                    : '';
                return `Przeterminowany produkt: ${productName}${expiration ? ` (data: ${expiration})` : ''}`;
            }
            case 3: {
                const productName = parsed['Product'] || notification.content;
                const expiration = parsed['ExpirationDate']
                    ? (() => {
                        const parsedDate = parsePolishDate(parsed['ExpirationDate']);
                        return parsedDate ? parsedDate.toLocaleDateString('pl-PL') : '';
                    })()
                    : '';
                return `Produkt zbliża się do terminu ważności: ${productName}${expiration ? ` (data: ${expiration})` : ''}`;
            }
            default:
                return notification.content;
        }
    };

    const getNotificationIcon = (type: 0 | 1 | 2 | 3) => {
        switch (type) {
            case 0: return <PersonPlusFill size={28} className="text-primary" />;
            case 1: return <BoxSeam size={28} className="text-secondary" />;
            case 2: return <ExclamationTriangleFill size={28} className="text-danger" />;
            case 3: return <ClockFill size={28} className="text-warning" />;
        }
    };

    const getBadgeVariant = (type: 0 | 1 | 2 | 3): string => {
        switch (type) {
            case 0: return 'primary';
            case 1: return 'secondary';
            case 2: return 'danger';
            case 3: return 'warning';
        }
    };

    const getBadgeLabel = (type: 0 | 1 | 2 | 3): string => {
        switch (type) {
            case 0: return 'Znajomy';
            case 1: return 'Kontener';
            case 2: return 'Przeterminowany';
            case 3: return 'Zbliża się termin';
        }
    };

    // Typy 2 i 3 (daty ważności) można tylko odrzucić — API zwróci błąd przy próbie akceptacji
    const canAccept = (type: 0 | 1 | 2 | 3): boolean => type === 0 || type === 1;

    return (
        <div>
            <Drawer open={drawerOpen} setOpen={setDrawerOpen} />

            <Header
                title="Powiadomienia"
                onMenuClick={() => setDrawerOpen(true)}
                rightElement={
                    <button
                        className="btn btn-link p-0 text-body"
                        onClick={() => fetchNotifications(false)}
                        disabled={refreshing}
                        aria-label="Odśwież powiadomienia"
                    >
                        <ArrowClockwise
                            size={24}
                            style={refreshing ? { animation: 'spin 0.8s linear infinite' } : undefined}
                        />
                    </button>
                }
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
                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                                <span className="fw-bold">{getNotificationContent(notification)}</span>
                                                <Badge bg={getBadgeVariant(notification.type)} className="fw-normal">
                                                    {getBadgeLabel(notification.type)}
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
                                            {(notification.type === 2 || notification.type === 3) && (() => {
                                                const info = notification.information || '';
                                                let containerId = notification.content;
                                                const idMatch = info.match(/ContainerId:\s*([^;]+)/);
                                                if (idMatch && idMatch[1]) {
                                                    containerId = idMatch[1].trim();
                                                }
                                                return (
                                                    <button
                                                        className="btn btn-link p-1 text-primary"
                                                        title="Przejdź do kontenera"
                                                        onClick={() => navigate(`/containers/${containerId}`)}
                                                    >
                                                        <ArrowRightCircleFill size={28} />
                                                    </button>
                                                );
                                            })()}
                                            {canAccept(notification.type) && (
                                                <button
                                                    className="btn btn-link p-1 text-success"
                                                    title="Zaakceptuj"
                                                    disabled={respondingId === notification.id}
                                                    onClick={() => handleRespond(notification, true)}
                                                >
                                                    <CheckCircleFill size={28} />
                                                </button>
                                            )}
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

            {/* Animacja obrotu dla ikony odświeżania */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default Notifications;