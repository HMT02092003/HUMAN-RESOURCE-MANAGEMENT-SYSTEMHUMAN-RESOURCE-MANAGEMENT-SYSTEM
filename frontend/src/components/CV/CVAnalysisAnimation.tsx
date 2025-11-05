"use client";

import React from 'react';

interface Props {
	size?: number; // px for icon
}

// Lightweight CSS-only Gemini-like badge for environments where framer-motion
// or other libs are not available. Keeps build simple and avoids extra deps.
const CVAnalysisAnimation: React.FC<Props> = ({ size = 20 }) => {
	const iconSize = Math.max(24, size);

	// Minimal white icon only (no animation, no gradients)
	return (
		<span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden>
			<svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M12 2l1.8 3.6L17.6 7l-3.8 1.4L12 12l-1.8-3.6L6.4 7l3.8-1.4L12 2z" fill="#ffffff" />
				<path d="M19 8.5l.6 1.2 1.2.6-1.2.6L19 12l-.6-1.2L17 10.2l1.2-.6L19 8.5z" fill="#ffffff" opacity="0.95" />
			</svg>
		</span>
	);
};

export default CVAnalysisAnimation;

