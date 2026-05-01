import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Container, Card, Button, Modal, Form } from 'react-bootstrap';
import { PersonCircle, EnvelopeFill, TelephoneFill, PeopleFill, PersonPlusFill } from 'react-bootstrap-icons';
import { getUser, removeUser, saveUser, saveFriends } from '../Storage';
import Drawer from './components/Drawer';
import Header from './components/Header';
import type { UserModel, FriendModel } from './types/models.ts';
import { apiFetch } from '../api.ts';

const MAX_VISIBLE_FRIENDS = 3;

const Profile: React.FC = () => {
    const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
    const [user, setUser] = useState<UserModel | null>(null);
    const [friends, setFriends] = useState<FriendModel[]>([]);
    const [loadingFriends, setLoadingFriends] = useState<boolean>(false);
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
    const [deletePassword, setDeletePassword] = useState<string>('');
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    const navigate = useNavigate();

    useEffect(() => {
        const init = async () => {
            const cachedUser = getUser();
            if (cachedUser) {
                setUser(cachedUser);
            }

            await fetchUser();
        };

        init();
    }, []);

    const fetchUser = async () => {
        const cachedUser = getUser();
        if (!cachedUser?.id) return;

        try {
            const response = await apiFetch(`/api/users/${cachedUser.id}`, {
                method: 'GET',
            });

            const data = await response.json();

            if (data.status === 0 && data.user) {
                const freshUser: UserModel = data.user;
                saveUser(freshUser);
                setUser(freshUser);
                await fetchFriends(freshUser);
            } else {
                if (cachedUser) {
                    await fetchFriends(cachedUser);
                }
            }
        } catch (error) {
            console.error('Błąd podczas pobierania danych użytkownika:', error);
            if (cachedUser) {
                await fetchFriends(cachedUser);
            }
        }
    };

    const fetchFriends = async (storedUser: UserModel) => {
        const friendIds: string[] = (storedUser.friends ?? [])
            .map((f: any) => f?.id ?? f)
            .filter((id: any): id is string => typeof id === 'string' && id.length > 0);

        if (friendIds.length === 0) return;

        setLoadingFriends(true);
        try {
            const response = await apiFetch('/api/users/users', {
                method: 'POST',
                body: JSON.stringify({ usersId: friendIds })
            });

            const data = await response.json();

            if (data.status === 0 && Array.isArray(data.users)) {
                saveFriends(data.users);
                setFriends(data.users);
            }
        } catch (error) {
            console.error('Błąd podczas pobierania znajomych:', error);
        } finally {
            setLoadingFriends(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!user?.id) {
            alert('Brak danych do usunięcia konta');
            return;
        }

        setIsDeleting(true);
        try {
            const response = await apiFetch(`/api/users/delete/${user.id}`, {
                method: 'DELETE',
                body: JSON.stringify({ password: deletePassword })
            });

            const data = await response.json();

            if (data.status === 0) {
                removeUser();
                setShowDeleteModal(false);
                setDeletePassword('');
                navigate('/login');
            } else {
                alert(`Błąd: ${data.message}`);
            }
        } catch (error) {
            console.error('Błąd podczas usuwania konta:', error);
            alert('Błąd sieci. Spróbuj ponownie.');
        } finally {
            setIsDeleting(false);
        }
    };

    const visibleFriends = friends.slice(0, MAX_VISIBLE_FRIENDS);
    const hasMoreFriends = friends.length > MAX_VISIBLE_FRIENDS;

    return (
        <>
            <Drawer open={drawerOpen} setOpen={setDrawerOpen} />

            <Header
                title="Profil"
                onMenuClick={() => setDrawerOpen(true)}
                rightElement={null}
            />

            <Container className="py-4">

                {/* Avatar + imię */}
                <div className="d-flex flex-column align-items-center mb-4">
                    {user?.profileUrl ? (
                        <img
                            src={user.profileUrl}
                            alt="Zdjęcie profilowe"
                            className="rounded-circle mb-3"
                            style={{ width: 96, height: 96, objectFit: 'cover' }}
                        />
                    ) : (
                        <PersonCircle size={96} className="text-secondary mb-3" />
                    )}
                    <h2 className="h5 fw-bold mb-0">
                        {user?.firstName && user?.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : 'Brak danych'}
                    </h2>
                    <span className="text-muted small">@{user?.login || '—'}</span>
                </div>

                {/* Dane kontaktowe */}
                <Card className="shadow-sm mb-3">
                    <Card.Body className="py-2 px-3">
                        <p className="small fw-semibold text-uppercase text-muted mb-2">Dane kontaktowe</p>

                        <div className="d-flex align-items-center gap-3 py-2 border-bottom">
                            <EnvelopeFill size={18} className="text-secondary flex-shrink-0" />
                            <div>
                                <p className="mb-0 small text-muted">E-mail</p>
                                <p className="mb-0">{user?.email || '—'}</p>
                            </div>
                        </div>

                        <div className="d-flex align-items-center gap-3 py-2">
                            <TelephoneFill size={18} className="text-secondary flex-shrink-0" />
                            <div>
                                <p className="mb-0 small text-muted">Telefon</p>
                                <p className="mb-0">{user?.phoneNumber || '—'}</p>
                            </div>
                        </div>
                    </Card.Body>
                </Card>

                {/* Znajomi */}
                <Card className="shadow-sm">
                    <Card.Body className="py-2 px-3">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <div className="d-flex align-items-center gap-2">
                                <PeopleFill size={18} className="text-secondary" />
                                <p className="small fw-semibold text-uppercase text-muted mb-0">
                                    Znajomi ({friends.length})
                                </p>
                            </div>
                            <button
                                className="btn btn-link p-0 text-secondary"
                                title="Dodaj znajomego"
                                onClick={() => navigate('/friends')}
                            >
                                <PersonPlusFill size={20} />
                            </button>
                        </div>

                        {loadingFriends ? (
                            <p className="text-muted small mb-0">Ładowanie znajomych...</p>
                        ) : visibleFriends.length > 0 ? (
                            <div className="d-flex flex-column gap-2">
                                {visibleFriends.map((friend, index) => (
                                    <div key={friend.id || index} className="d-flex align-items-center gap-3 py-1">
                                        <PersonCircle size={36} className="text-secondary flex-shrink-0" />
                                        <div>
                                            <p className="mb-0 fw-semibold">{friend.firstName} {friend.lastName}</p>
                                            <p className="mb-0 small text-muted">@{friend.login}</p>
                                        </div>
                                    </div>
                                ))}

                                {hasMoreFriends && (
                                    <div className="d-flex align-items-center gap-3 py-1 text-muted">
                                        <PersonCircle size={36} className="text-secondary flex-shrink-0 opacity-25" />
                                        <p className="mb-0 fw-semibold" style={{ letterSpacing: '0.2em' }}>
                                            +{friends.length - MAX_VISIBLE_FRIENDS} więcej...
                                        </p>
                                    </div>
                                )}

                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    className="mt-2 w-100"
                                    onClick={() => navigate('/friends')}
                                >
                                    Pokaż wszystkich znajomych
                                </Button>
                            </div>
                        ) : (
                            <p className="text-muted small mb-0">Brak znajomych</p>
                        )}
                    </Card.Body>
                </Card>

                {/* Akcje */}
                <div className="d-flex flex-column gap-2 mt-3">
                    <div className="d-flex gap-2">
                        <Button
                            variant="outline-dark"
                            className="flex-grow-1 border-2 fw-semibold py-2"
                            onClick={() => navigate('/edit-profile')}
                        >
                            Edytuj Dane
                        </Button>
                        <Button
                            variant="outline-danger"
                            className="flex-grow-1 border-2 fw-semibold py-2"
                            onClick={() => { removeUser(); navigate('/login'); }}
                        >
                            Wyloguj
                        </Button>
                    </div>
                    <Button
                        variant="danger"
                        className="w-100 border-2 fw-semibold py-2"
                        onClick={() => setShowDeleteModal(true)}
                    >
                        Usuń Konto
                    </Button>
                </div>
            </Container>

            {/* Modal potwierdzenia usunięcia konta */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Usuń konto</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="mb-3">
                        <strong>Czy na pewno chcesz usunąć swoje konto?</strong>
                    </p>
                    <p className="text-muted small mb-3">
                        Ta operacja jest nieodwracalna. Twoje konto oraz wszystkie powiązane dane zostaną permanentnie usunięte z systemu.
                    </p>
                    <Form.Group>
                        <Form.Label className="fw-semibold">
                            Potwierdź hasło
                        </Form.Label>
                        <Form.Control
                            type="password"
                            placeholder="Wpisz hasło"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            disabled={isDeleting}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setShowDeleteModal(false);
                            setDeletePassword('');
                        }}
                        disabled={isDeleting}
                    >
                        Anuluj
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleDeleteAccount}
                        disabled={isDeleting || !deletePassword}
                    >
                        {isDeleting ? 'Usuwanie...' : 'Usuń konto'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default Profile;