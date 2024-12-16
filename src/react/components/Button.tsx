import { useOnHover } from "react/hooks/useOnHover";
import {React} from "/react/libReact";


export const Button = ({ bg, title, onButtonClick }: { bg: string; title: string; onButtonClick: () => void }) => {
    const buttonRef = React.useRef<HTMLDivElement>(null);

    const buttonHovered = useOnHover(buttonRef);
    return (
        <div
            ref={buttonRef}
            onClick={onButtonClick}
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
                fontFamily: "Arial Black",
                transition: "filter 0.1s ease-out",
                filter: buttonHovered ? "saturate(100%)" : "saturate(50%)",
            }}
        >
            {title}
        </div>
    );
};
