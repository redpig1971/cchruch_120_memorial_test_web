import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const DeceasedLocation = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const deceased = state?.deceased;

    if (!deceased) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p>잘못된 접근입니다.</p>
                <button onClick={() => navigate('/home')}>메인으로 돌아가기</button>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#f8fafc',
            padding: '1rem'
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                width: '100%',
                maxWidth: '800px',
                textAlign: 'center'
            }}>
                <h1 style={{
                    fontSize: '2.5rem',
                    marginBottom: '1rem',
                    color: '#1e293b'
                }}>
                    {deceased.name}님의 위치
                </h1>

                <p style={{
                    fontSize: '3rem',
                    fontWeight: 'bold',
                    color: '#3b82f6',
                    marginBottom: '2rem'
                }}>
                    {deceased.location}
                </p>

                <div style={{
                    width: '100%',
                    backgroundColor: '#fff',
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '3rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '1rem'
                }}>
                    {deceased.image_url ? (
                        <img
                            src={deceased.image_url}
                            alt="위치 지도"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '60vh',
                                objectFit: 'contain'
                            }}
                        />
                    ) : (
                        <p style={{ padding: '2rem', color: '#94a3b8' }}>지도 이미지가 없습니다.</p>
                    )}
                </div>

                <button
                    onClick={() => navigate('/home')}
                    style={{
                        padding: '1rem 3rem',
                        fontSize: '1.2rem',
                        backgroundColor: '#1e293b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    메인으로 돌아가기
                </button>
            </div>
        </div>
    );
};

export default DeceasedLocation;
