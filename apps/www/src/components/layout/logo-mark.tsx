type LogoMarkProps = {
    className?: string;
    /** Set when the mark stands alone; omit next to text that already names the brand. */
    label?: string;
};

// Brand asset: these two hex values are the fixed PakFactory mark colors and
// deliberately do not follow the theme, so they stay literal here.
const MARK_GREEN = '#6DBE45';
const MARK_NAVY = '#211F57';

export function LogoMark({className, label}: LogoMarkProps) {
    return (
        <svg
            viewBox="2 0.9 53.5 60.2"
            className={className}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...(label
                ? {role: 'img', 'aria-label': label}
                : {'aria-hidden': true})}
        >
            <path
                d="M27.3461 1.36693L6.10367 13.6534C4.27924 14.7092 4.27924 17.347 6.10367 18.4016L27.3461 30.6881C28.1926 31.1773 28.7144 32.0831 28.7144 33.0628V57.6357C28.7144 59.7462 30.9949 61.0651 32.8193 60.0104L54.0617 47.7239C54.9083 47.2347 55.4301 46.3289 55.4301 45.3493V17.6101C55.4301 16.6304 54.9083 15.7258 54.0617 15.2354L30.0827 1.36693C29.2361 0.877689 28.1926 0.877689 27.3461 1.36693ZM48.7175 44.6327L35.3947 52.3383C34.8016 52.6821 34.0587 52.2529 34.0587 51.5652V29.9704C34.0587 28.9907 33.5369 28.0861 32.6903 27.5957L14.0234 16.7989C13.429 16.455 13.429 15.5965 14.0234 15.2527L27.3461 7.5471C28.1926 7.05785 29.2361 7.05785 30.0827 7.5471L48.7175 18.3255C49.564 18.8147 50.0858 19.7205 50.0858 20.7001V42.2569C50.0858 43.2365 49.564 44.1411 48.7175 44.6315V44.6327Z"
                fill={MARK_GREEN}
            />
            <path
                d="M6.00591 24.5313L22.0042 33.7854C22.8508 34.2747 23.3725 35.1805 23.3725 36.1601V54.6337C23.3725 56.706 21.1323 58.0019 19.3413 56.9657L3.36832 47.7254C2.52176 47.2362 2 46.3304 2 45.3507V26.8472C2 24.7875 4.22525 23.4998 6.00591 24.5302V24.5313Z"
                fill={MARK_NAVY}
            />
        </svg>
    );
}
