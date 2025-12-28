import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PhotoDetail = ({ currentUser }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { photo } = location.state || {};
    const [uploadStatus, setUploadStatus] = useState('');

    // Confirmation State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    // If accessed directly without state, redirect to home
    if (!photo || !currentUser) {
        setTimeout(() => navigate('/home'), 0);
        return null;
    }

    const handleMainClick = () => {
        navigate('/home');
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setIsConfirmOpen(true);
        }
    };

    const handleConfirmUpload = async () => {
        if (!selectedFile) return;

        try {
            // No need to manually DELETE. Server handles replacement for the specific slot.
            // Pass params in URL to avoid Multer body ordering issues
            const queryParams = new URLSearchParams({
                userId: currentUser.id,
                slotNumber: photo.slot_number
            }).toString();

            const formData = new FormData();
            formData.append('photo', selectedFile);

            const response = await fetch(`/api/photos?${queryParams}`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                alert('사진이 성공적으로 등록되었습니다.');
                navigate('/home');
            } else {
                const data = await response.json();
                setUploadStatus('업로드 실패: ' + data.message);
                setIsConfirmOpen(false); // Close modal on error to allow retry
            }
        } catch (error) {
            console.error(error);
            setUploadStatus('오류가 발생했습니다.');
            setIsConfirmOpen(false);
        }
    };

    const handleCancel = () => {
        setIsConfirmOpen(false);
        setSelectedFile(null);
    };

    return (
        <div className="photo-detail-container">
            <header className="hero">
                <h1>{currentUser.username}님의 갤러리</h1>
            </header>

            <main className="detail-content">
                <div className="photo-display">
                    {photo.type === 'logo' ? (
                        <div className="empty-slot-placeholder">
                            <img src="/cchurch_logo.png" alt="빈 슬롯" className="detail-logo" />
                            <p>{photo.slot_number}번 슬롯이 비어있습니다.</p>
                        </div>
                    ) : (
                        <img
                            src={`http://localhost:5000/uploads/${photo.filename}`}
                            alt="상세 이미지"
                            className="detail-image"
                        />
                    )}
                </div>

                <div className="control-buttons bottom-controls">
                    <label className="btn-toggle active" style={{ cursor: 'pointer' }}>
                        {photo.type === 'logo' ? '사진 등록하기' : '사진 바꾸기'}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                    </label>
                    <button className="btn-toggle" onClick={handleMainClick}>
                        메인으로
                    </button>
                </div>
                {uploadStatus && <p className="status-msg">{uploadStatus}</p>}
            </main>

            {/* Confirmation Modal */}
            {isConfirmOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{photo.type === 'logo' ? '사진 등록' : '사진 교체'}</h3>
                        <p style={{ margin: '1rem 0', wordBreak: 'keep-all' }}>
                            {photo.slot_number}번 자리에 새로운 사진이 등록됩니다.<br />
                            (기존 사진이 있다면 대체됩니다)
                        </p>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={handleCancel}>취소</button>
                            <button
                                className={`btn-confirm ${photo.type === 'logo' ? 'safe' : ''}`}
                                onClick={handleConfirmUpload}
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PhotoDetail;
