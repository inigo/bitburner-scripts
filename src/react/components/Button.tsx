import {React} from "@/react/libReact";


export function Button({ bg, title, onButtonClick, disabled = false }: { bg: string; title: string; onButtonClick: () => void, disabled?: boolean  }) {
    const buttonRef = React.useRef<HTMLDivElement>(null);
    const nullFn = () => { return; };
    return (
        <div
            ref={buttonRef}
            onClick={ (!disabled) ? onButtonClick : nullFn }
            style={{
                backgroundColor: bg,
                border: "none",
                color: "white",
                padding: "5px 5px",
                textAlign: "center",
                textDecoration: "none",
                display: "inline-block",
                fontSize: "12px",
                margin: "4px 2px",
                cursor: "pointer",
                borderRadius: "5px",
                fontFamily: "Arial",
                transition: "filter 0.1s ease-out",
                filter: !disabled ? "saturate(100%)" : "saturate(10%)"
            }}
        >
            {title}
        </div>
    );
};
