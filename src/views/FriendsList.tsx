import React, { useState, useEffect } from 'react';
import { Container, Card, Form, InputGroup, Button, Alert } from 'react-bootstrap';
import { PersonCircle, Search, PersonPlusFill, XCircleFill } from 'react-bootstrap-icons';
import { getUser, getStoredFriends } from '../Storage';
import Drawer from './components/Drawer';
import Header from './components/Header';
import { apiFetch } from '../api';
import type { FriendModel, UserModel } from './types/models';

const FriendsList: React.FC = () => {
    const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
    const [friends, setFriends] = useState<FriendModel[]>([]);
    const [searchInput, setSearchInput] = useState<string>('');
    const [sendingInvite, setSendingInvite] = useState<boolean>(false);
    const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        const cached = getStoredFriends();
        setFriends(cached);
    }, []);

    const query = searchInput.trim().toLowerCase();

    const filteredFriends = query
        ? friends.filter(f =>
            f.login.toLowerCase().includes(query) ||
            f.email.toLowerCase().includes(query) ||
            f.firstName.toLowerCase().includes(query) ||
            f.lastName.toLowerCase().includes(query)
        )
        : friends;

    const showAddPrompt = query.length > 0 && filteredFriends.length === 0;

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

            <Container className="py-4">

                {/* Wiadomość o zaproszeniu */}
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

                {/* Wyszukiwarka */}
                <InputGroup className="mb-3">
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

                {/* Lista znajomych */}
                {filteredFriends.length > 0 ? (
                    <Card className="shadow-sm">
                        <Card.Body className="py-2 px-3">
                            <p className="small fw-semibold text-uppercase text-muted mb-2">
                                Znajomi ({filteredFriends.length})
                            </p>
                            <div className="d-flex flex-column">
                                {filteredFriends.map((friend, index) => (
                                    <div
                                        key={friend.id || index}
                                        className={`d-flex align-items-center gap-3 py-2 ${
                                            index < filteredFriends.length - 1 ? 'border-bottom' : ''
                                        }`}
                                    >
                                        <PersonCircle size={40} className="text-secondary flex-shrink-0" />
                                        <div className="flex-grow-1 overflow-hidden">
                                            <p className="mb-0 fw-semibold text-truncate">
                                                {friend.firstName} {friend.lastName}
                                            </p>
                                            <p className="mb-0 small text-muted text-truncate">
                                                @{friend.login} · {friend.email}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card.Body>
                    </Card>
                ) : !showAddPrompt ? (
                    <p className="text-muted small text-center mt-4">Brak znajomych</p>
                ) : null}

                {/* Prompt dodania znajomego gdy brak wyników wyszukiwania */}
                {showAddPrompt && (
                    <Card className="shadow-sm border-2 border-secondary" style={{ borderStyle: 'dashed' }}>
                        <Card.Body className="py-3 px-3">
                            <div className="d-flex align-items-center gap-3">
                                <PersonPlusFill size={28} className="text-secondary flex-shrink-0" />
                                <div className="flex-grow-1 overflow-hidden">
                                    <p className="mb-0 small text-muted">Nie znaleziono znajomego. Czy chcesz dodać:</p>
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

            </Container>
        </>
    );
};

export default FriendsList;