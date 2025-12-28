import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Guestbook from '../components/Guestbook';

const Home = ({ currentUser, onLogout, onUpdateUser }) => {
    const [photos, setPhotos] = useState([]);
    const [serverStatus, setServerStatus] = useState('확인 중...');
    const navigate = useNavigate();

    const fetchPhotos = () => {
        if (!currentUser) return;
        fetch(`/api/photos?userId=${currentUser.id}`)
            .then(res => res.json())
            .then(data => setPhotos(data.photos || []))
            .catch(err => console.error('Error fetching photos:', err));
    };

    useEffect(() => {
        fetchPhotos();
        fetch('/api/health')
            .then(res => res.json())
            .then(data => setServerStatus(data.message))
            .catch(err => setServerStatus('서버 연결 오류'));
    }, [currentUser]);

    const handleItemClick = (item) => {
        navigate('/photo', { state: { photo: item } });
    };

    const handleRegisterDeceased = async () => {
        const name = window.prompt('고인의 성함을 입력해주세요:');
        if (!name) return;

        try {
            const response = await fetch('/api/users/deceased', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, deceasedName: name })
            });

            const data = await response.json();
            if (response.ok) {
                // Update local state immediately without logout
                onUpdateUser(prev => ({ ...prev, deceased_name: name }));
                alert('등록되었습니다.');
            } else {
                alert(data.message || '등록에 실패했습니다.');
            }
        } catch (error) {
            console.error('Error registering deceased name:', error);
            alert('오류가 발생했습니다.');
        }
    };

    const handleDeceasedClick = async (name) => {
        try {
            const response = await fetch(`/api/deceased/${name}`);
            if (response.ok) {
                const data = await response.json();
                navigate('/deceased-location', { state: { deceased: data.deceased } });
            } else {
                alert('정보를 불러올 수 없습니다.');
            }
        } catch (error) {
            console.error('Error fetching deceased info:', error);
        }
    };

    // Prepare Fixed Slots (1, 2, 3)
    const fixedSlots = [1, 2, 3].map(slotNum => {
        // Use loose equality (==) to handle potential string/number mismatch from API
        const found = photos.find(p => p.slot_number == slotNum);
        if (found) return { ...found, type: 'photo' };
        return { type: 'logo', id: `slot-${slotNum}`, slot_number: slotNum, filename: null };
    });

    return (
        <div className="home-container">
            <header className="hero">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1>
                            {currentUser ? (
                                <>
                                    {currentUser.username}님
                                    {currentUser.deceased_name ? (
                                        <span
                                            onClick={() => handleDeceasedClick(currentUser.deceased_name)}
                                            style={{
                                                fontSize: '0.8em',
                                                color: '#3b82f6',
                                                marginLeft: '8px',
                                                cursor: 'pointer',
                                                textDecoration: 'underline'
                                            }}
                                        >
                                            ({currentUser.deceased_name})
                                        </span>
                                    ) : (
                                        <button
                                            onClick={handleRegisterDeceased}
                                            style={{
                                                marginLeft: '10px',
                                                padding: '0.2rem 0.5rem',
                                                fontSize: '0.7rem',
                                                backgroundColor: '#3b82f6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            고인 등록
                                        </button>
                                    )}
                                    환영합니다
                                </>
                            ) : (
                                '손님'
                            )}
                        </h1>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            서버 상태: {serverStatus}
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        로그아웃
                    </button>
                </div>
            </header>

            <main className="content">
                <div className="ticker-description">
                    <p>사진을 클릭하여 크게 보거나 변경할 수 있습니다.</p>
                </div>
                {/* Ticker Section */}
                <div className="ticker-container">
                    <div className="ticker-track">
                        {/* Duplicate for loop effect */}
                        {[...fixedSlots, ...fixedSlots, ...fixedSlots].map((item, index) => (
                            <div
                                key={`${item.id}-${index}`}
                                className="ticker-item"
                                onClick={() => handleItemClick(item)}
                            >
                                {item.type === 'logo' ? (
                                    <img src="/cchurch_logo.png" alt="기본 로고" className="default-logo-ticker" />
                                ) : (
                                    <img
                                        src={item.url || `/uploads/${item.filename}`}
                                        alt="사용자 사진"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Guestbook Section */}
            {currentUser && currentUser.deceased_name && (
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem 2rem 1rem' }}>
                    <Guestbook deceasedName={currentUser.deceased_name} currentUser={currentUser} />
                </div>
            )}
        </div>
    );
};

export default Home;
