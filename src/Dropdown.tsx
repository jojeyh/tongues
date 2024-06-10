interface DropdownProps {
    language: string;
    changeLanguage: any;
}

function Dropdown(props: DropdownProps) {
    // Example options for the dropdown
    const options = [
        'English',
        'Spanish',
        'French',
        'German',
        'Italian',
        'Portuguese',
        'Dutch',
    ];

    return (
        <div>
            {/* Step 2 & 3: Create and populate the dropdown list */}
            <select value={props.language} onChange={props.changeLanguage}>
                <option value="">Select an option</option>
                {options.map((option, index) => (
                    <option key={index} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default Dropdown;