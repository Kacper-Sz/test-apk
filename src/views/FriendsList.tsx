import React, { useState, useEffect } from 'react';
import { Container, Card, Form, InputGroup, Button, Alert, Modal } from 'react-bootstrap';
import { PersonCircle, Search, PersonPlusFill, XCircleFill, TrashFill, XLg } from 'react-bootstrap-icons';
import { getUser, getStoredFriends, saveFriends } from '../Storage';
import Drawer from './components/Drawer';
import Header from './components/Header';
import { apiFetch } from '../api';
import type { FriendModel, UserModel } from './types/models';
import { useLongPress } from 'use-long-press';

const FriendsList: React.FC = () => {
    const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
    const [friends, setFriends] = useState<FriendModel[]>([]);
    const [searchInput, setSearchInput] = useState<string>('');
    const [sendingInvite, setSendingInvite] = useState<boolean>(false);
    const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // usuwanie
    const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
    const [selectedFriends, setSelectedFriends] = useState<FriendModel[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [deleteLoadingIds, setDeleteLoadingIds] = useState<string[]>([]);

    useEffect(() => {
        const cached = getStoredFriends();
        setFriends(cached);
    }, []);

    useEffect(() => {
        if (!isSelectionMode) {
            setSelectedFriends([]);
        }
    }, [isSelectionMode]);

    const query = searchInput.trim().toLowerCase();

    const filteredFriends = query
        ? friends.filter(f =>
            f.login.toLowerCase().includes(query) ||
            f.email.toLowerCase().includes(query) ||
            f.firstName.toLowerCase().includes(query) ||
            f.lastName.toLowerCase().includes(query)
        )
        : friends;

    const exactMatch = friends.some(f =>
        f.login.toLowerCase() === query ||
        f.email.toLowerCase() === query
    );
    const showAddPrompt = query.length > 0 && !exactMatch;

    // zaznaczenie

    const selectFriend = (friend: FriendModel) => {
        if (!selectedFriends.some(f => f.id === friend.id)) {
            setSelectedFriends(prev => [...prev, friend]);
        }
    };

    const unselectFriend = (friend: FriendModel) => {
        setSelectedFriends(prev => prev.filter(f => f.id !== friend.id));
    };

    const handleLongPress = useLongPress((event) => {
        setIsSelectionMode(true);
        const friendCard = (event.target as Element).closest('[data-friend-id]') as HTMLElement;
        const friend = friends.find(f => f.id === friendCard?.dataset.friendId);
        if (friend && !selectedFriends.some(f => f.id === friend.id)) {
            selectFriend(friend);
        }
    }, {
        onCancel: (event) => {
            if (isSelectionMode) {
                const friendCard = (event.target as Element).closest('[data-friend-id]') as HTMLElement;
                const friend = friends.find(f => f.id === friendCard?.dataset.friendId);
                if (friend) {
                    if (selectedFriends.some(f => f.id === friend.id)) {
                        unselectFriend(friend);
                    } else {
                        selectFriend(friend);
                    }
                }
            }
        },
    });

    // usuwanie

    const removeFriendsFromState = (ids: string[]) => {
        const updated = friends.filter(f => !ids.includes(f.id));
        setFriends(updated);
        saveFriends(updated);
    };

    const handleDeleteSingle = async (friend: FriendModel) => {
        const user: UserModel | null = getUser();
        if (!user?.id || !friend.id) return;

        setDeleteLoadingIds([friend.id]);
        setIsDeleting(true);
        try {
            const res = await apiFetch(`/api/users/deleteFriends/${user.id}`, {
                method: 'PUT',
                body: JSON.stringify({ friendsId: [friend.id] }),
            });
            const data = await res.json();
            if (data.status !== 0) {
                console.log(`Błąd: ${data.message}`);
                return;
            }
            // Zaktualizuj stan po pomyślnym usunięciu
            removeFriendsFromState([friend.id]);
        } catch {
            console.log('Błąd połączenia z serwerem.');
        } finally {
            setDeleteLoadingIds([]);
            setIsDeleting(false);
            setShowDeleteModal(false);
            setIsSelectionMode(false);
            setSelectedFriends([]);
        }
    };

    const handleDeleteMultiple = async (toDelete: FriendModel[]) => {
        const user: UserModel | null = getUser();
        const ids = toDelete.map(f => f.id).filter(Boolean);
        if (!user?.id || ids.length === 0) return;

        setDeleteLoadingIds(ids);
        setIsDeleting(true);
        try {
            const res = await apiFetch(`/api/users/deleteFriends/${user.id}`, {
                method: 'PUT',
                body: JSON.stringify({ friendsId: ids }),
            });
            const data = await res.json();
            if (data.status !== 0) {
                console.log(`Błąd: ${data.message}`);
                return;
            }
            // Zaktualizuj stan po pomyślnym usunięciu
            removeFriendsFromState(ids);
        } catch {
            console.log('Błąd połączenia z serwerem.');
        } finally {
            setDeleteLoadingIds([]);
            setIsDeleting(false);
            setShowDeleteModal(false);
            setIsSelectionMode(false);
            setSelectedFriends([]);
        }
    };

    const handleConfirmDelete = () => {
        if (selectedFriends.length === 1) {
            handleDeleteSingle(selectedFriends[0]);
        } else {
            handleDeleteMultiple(selectedFriends);
        }
    };

    // dodawniae

    const handleAddFriend = async () => {
        const user: UserModel | null = getUser();
        if (!user) {
            setInviteMessage({ type: 'error', text: 'Musisz być zalogowany' });
            return;
        }

        const targetUser = searchInput.trim();
        if (!targetUser) {
            setInviteMessage({ type: 'error', text: 'Wpisz login lub email' });
            return;
        }

        setSendingInvite(true);
        setInviteMessage(null);

        try {
            const response = await apiFetch('/api/notifications/addfriend', {
                method: 'POST',
                body: JSON.stringify({
                    ownerLoginOrEmail: targetUser,
                    senderId: user.id,
                    role: null // tego chyba nawet tu nie musi byc by chyba z bomby jest null
                }),
            });

            const data = await response.json();
            if (data.status === 0) {
                setInviteMessage({ type: 'success', text: 'Zaproszenie wysłane pomyślnie! Poczekaj aż użytkownik zaakceptuje zaproszenie' });
                setSearchInput('');
                setTimeout(() => setInviteMessage(null), 3000);
            } else {
                setInviteMessage({ type: 'error', text: data.message || 'Błąd przy wysyłaniu zaproszenia' });
            }
        } catch (error) {
            console.error('Błąd podczas wysyłania zaproszenia:', error);
            setInviteMessage({ type: 'error', text: 'Błąd połączenia. Spróbuj ponownie.' });
        } finally {
            setSendingInvite(false);
        }
    };

    return (
        <>
            <Drawer open={drawerOpen} setOpen={setDrawerOpen} />

            <Header
                title="Znajomi"
                onMenuClick={() => setDrawerOpen(true)}
                rightElement={null}
            />

            {/* Pasek wyszukiwania */}
            <div
                style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    backgroundColor: 'var(--bs-body-bg, #fff)',
                    borderBottom: '1px solid var(--bs-border-color, #dee2e6)',
                    padding: '12px 16px',
                }}
            >
                <InputGroup className="input-group-password-focus">
                    <InputGroup.Text className="bg-white border-2 border-dark border-end-0">
                        <Search size={16} className="text-secondary" />
                    </InputGroup.Text>
                    <Form.Control
                        type="text"
                        placeholder="Szukaj lub dodaj po nazwie, loginie lub e-mailu..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        className="border-2 border-dark border-start-0 ps-0"
                    />
                    {searchInput.length > 0 && (
                        <InputGroup.Text
                            className="bg-white border-2 border-dark border-start-0"
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSearchInput('')}
                        >
                            <XCircleFill size={16} className="text-secondary" />
                        </InputGroup.Text>
                    )}
                </InputGroup>
            </div>

            {/* Pasek trybu zaznaczania */}
            {isSelectionMode && (
                <div className="w-auto bg-success p-2 text-white d-flex justify-content-between align-items-center">
                    <p className="m-0 fw-bold">Zaznaczono: {selectedFriends.length}</p>
                    <div className="d-flex align-items-center gap-3">
                        <TrashFill
                            size={24}
                            style={{ cursor: selectedFriends.length > 0 ? 'pointer' : 'default', opacity: selectedFriends.length > 0 ? 1 : 0.4 }}
                            onClick={() => {
                                if (selectedFriends.length > 0) setShowDeleteModal(true);
                            }}
                        />
                        <XLg size={24} style={{ cursor: 'pointer' }} onClick={() => setIsSelectionMode(false)} />
                    </div>
                </div>
            )}

            <Container className="py-4">

                {/* Komunikat o zaproszeniu */}
                {inviteMessage && (
                    <Alert
                        variant={inviteMessage.type === 'success' ? 'success' : 'danger'}
                        className="mb-3"
                        dismissible
                        onClose={() => setInviteMessage(null)}
                    >
                        {inviteMessage.text}
                    </Alert>
                )}

                {/* Prompt dodania znajomego */}
                {showAddPrompt && (
                    <Card className="shadow-sm border-2 border-secondary mb-3" style={{ borderStyle: 'dashed' }}>
                        <Card.Body className="py-3 px-3">
                            <div className="d-flex align-items-center gap-3">
                                <PersonPlusFill size={28} className="text-secondary flex-shrink-0" />
                                <div className="flex-grow-1 overflow-hidden">
                                    <p className="mb-0 small text-muted">Wyślij zaproszenie do:</p>
                                    <p className="mb-0 fw-semibold text-truncate">{searchInput.trim()}</p>
                                </div>
                                <Button
                                    variant="outline-dark"
                                    size="sm"
                                    className="border-2 fw-semibold flex-shrink-0"
                                    onClick={handleAddFriend}
                                    disabled={sendingInvite}
                                >
                                    {sendingInvite ? 'Wysyłanie...' : 'Dodaj'}
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                )}

                {/* Lista znajomych */}
                {filteredFriends.length > 0 ? (
                    <Card className="shadow-sm">
                        <Card.Body className="py-2 px-3">
                            <p className="small fw-semibold text-uppercase text-muted mb-2">
                                Znajomi ({filteredFriends.length})
                            </p>
                            <div className="d-flex flex-column">
                                {filteredFriends.map((friend, index) => {
                                    const isSelected = selectedFriends.some(f => f.id === friend.id);
                                    const isLoadingDelete = deleteLoadingIds.includes(friend.id);

                                    return (
                                        <div
                                            key={friend.id || index}
                                            data-friend-id={friend.id}
                                            className={`d-flex align-items-center gap-3 py-2 rounded px-2 ${
                                                index < filteredFriends.length - 1 ? 'border-bottom' : ''
                                            } ${isSelected ? 'bg-success-subtle border border-2 border-success' : ''}`}
                                            style={{ transition: 'background 0.15s' }}
                                            {...handleLongPress()}
                                        >
                                            <div style={{ height: 40, width: 40 }}>
                                                {friend.profileUrl ? (
                                                    <img
                                                        src={friend.profileUrl}
                                                        alt="Profil"
                                                        className="img-fluid rounded-circle"
                                                    />
                                                ) : (
                                                    <PersonCircle
                                                        size={40}
                                                        className={`flex-shrink-0 `}
                                                    />
                                                )}
                                            </div>
                                            <div className="flex-grow-1 overflow-hidden">
                                                <p className="mb-0 fw-semibold text-truncate">
                                                    {friend.firstName} {friend.lastName}
                                                </p>
                                                <p className="mb-0 small text-muted text-truncate">
                                                    @{friend.login} · {friend.email}
                                                </p>
                                            </div>

                                            {/* Przycisk usunięcia — widoczny zawsze lub tylko poza trybem zaznaczania */}
                                            {!isSelectionMode && (
                                                <Button
                                                    variant="link"
                                                    className="p-1 text-danger flex-shrink-0"
                                                    disabled={isLoadingDelete}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedFriends([friend]);
                                                        setShowDeleteModal(true);
                                                    }}
                                                    title="Usuń znajomego"
                                                >
                                                    {isLoadingDelete
                                                        ? <span className="spinner-border spinner-border-sm" />
                                                        : <TrashFill size={18} />
                                                    }
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </Card.Body>
                    </Card>
                ) : !showAddPrompt ? (
                    <p className="text-muted small text-center mt-4">Brak znajomych</p>
                ) : null}

            </Container>

            {/* Modal potwierdzenia usunięcia */}
            <Modal show={showDeleteModal} onHide={() => !isDeleting && setShowDeleteModal(false)} centered>
                <Modal.Header closeButton={!isDeleting}>
                    <Modal.Title>
                        {selectedFriends.length > 1
                            ? `Usuń ${selectedFriends.length} znajomych`
                            : 'Usuń znajomego'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="mb-2">
                        <strong>
                            {selectedFriends.length > 1
                                ? `Czy na pewno chcesz usunąć ${selectedFriends.length} znajomych?`
                                : `Czy na pewno chcesz usunąć znajomego "${selectedFriends[0]?.firstName} ${selectedFriends[0]?.lastName}"?`}
                        </strong>
                    </p>
                    <p className="text-muted small mb-0">
                        Ta operacja jest nieodwracalna.
                    </p>
                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-evenly">
                    <Button
                        variant="secondary"
                        onClick={() => setShowDeleteModal(false)}
                        disabled={isDeleting}
                    >
                        Anuluj
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleConfirmDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? 'Usuwanie...' : 'Usuń'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default FriendsList;