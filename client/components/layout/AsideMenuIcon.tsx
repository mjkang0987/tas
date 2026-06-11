import styled from 'styled-components';

export const AsideMenuIcon = ({icon}: {icon: string}) => {
    switch (icon) {
        case 'day':
            return (
                <StyledMenuIcon viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
                    <path d="M7.5 3.5V6.5M16.5 3.5V6.5M3.5 9H20.5M8 13H8.01M12 13H12.01M16 13H16.01M8 17H8.01M12 17H12.01M16 17H16.01" />
                </StyledMenuIcon>
            );
        case 'three':
            return (
                <StyledMenuIcon viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
                    <path d="M7.5 3.5V6.5M16.5 3.5V6.5M3.5 9H20.5M7.5 13.5H16.5M7.5 17H14.5" />
                </StyledMenuIcon>
            );
        case 'week':
            return (
                <StyledMenuIcon viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
                    <path d="M7.5 3.5V6.5M16.5 3.5V6.5M3.5 9H20.5M7.5 13H16.5M7.5 17H16.5" />
                </StyledMenuIcon>
            );
        case 'month':
            return (
                <StyledMenuIcon viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3.5" y="4.5" width="17" height="16" rx="3" />
                    <path d="M7.5 3.5V6.5M16.5 3.5V6.5M3.5 9H20.5M8 13H8.01M12 13H12.01M16 13H16.01M8 17H8.01M12 17H12.01M16 17H16.01" />
                </StyledMenuIcon>
            );
        case 'year':
            return (
                <StyledMenuIcon viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3.5" y="4.5" width="17" height="16" rx="3" />
                    <path d="M7.5 3.5V6.5M16.5 3.5V6.5M3.5 9H20.5M8 13H16M8 17H16" />
                </StyledMenuIcon>
            );
        case 'create':
            return (
                <StyledMenuIcon viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 5V19M5 12H19" />
                </StyledMenuIcon>
            );
        case 'customerAdd':
            return (
                <StyledMenuIcon viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="10" cy="8" r="3.5" />
                    <path d="M3 21V18.5C3 16.6 4.6 15 6.5 15H13.5C15.4 15 17 16.6 17 18.5V21" />
                    <path d="M19 8V14M16 11H22" />
                </StyledMenuIcon>
            );
        case 'calendarManage':
            return (
                <StyledMenuIcon viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3.5" y="4.5" width="17" height="16" rx="3" />
                    <path d="M7.5 3.5V6.5M16.5 3.5V6.5M3.5 9H20.5M8 13H16M8 17H13.5" />
                </StyledMenuIcon>
            );
        case 'settings':
            return (
                <StyledMenuIcon viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="3.2" />
                    <path d="M19.4 15A1.65 1.65 0 0 0 19.73 16.82L19.79 16.88A2 2 0 1 1 16.96 19.71L16.9 19.65A1.65 1.65 0 0 0 15.08 19.32A1.65 1.65 0 0 0 14.08 20.84V20.99A2 2 0 1 1 10.08 20.99V20.9A1.65 1.65 0 0 0 9 19.39A1.65 1.65 0 0 0 7.18 19.72L7.12 19.78A2 2 0 1 1 4.29 16.95L4.35 16.89A1.65 1.65 0 0 0 4.68 15.07A1.65 1.65 0 0 0 3.16 14.07H3.01A2 2 0 1 1 3.01 10.07H3.1A1.65 1.65 0 0 0 4.61 9A1.65 1.65 0 0 0 4.28 7.18L4.22 7.12A2 2 0 1 1 7.05 4.29L7.11 4.35A1.65 1.65 0 0 0 8.93 4.68A1.65 1.65 0 0 0 9.93 3.16V3.01A2 2 0 1 1 13.93 3.01V3.1A1.65 1.65 0 0 0 15 4.61A1.65 1.65 0 0 0 16.82 4.28L16.88 4.22A2 2 0 1 1 19.71 7.05L19.65 7.11A1.65 1.65 0 0 0 19.32 8.93A1.65 1.65 0 0 0 20.84 9.93H20.99A2 2 0 1 1 20.99 13.93H20.9A1.65 1.65 0 0 0 19.39 15Z" />
                </StyledMenuIcon>
            );
        case 'revenue':
            return (
                <StyledMenuIcon viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 4V20M16 7.5C16 6.1 14.2 5 12 5C9.8 5 8 6.1 8 7.5C8 8.9 9.8 10 12 10C14.2 10 16 11.1 16 12.5C16 13.9 14.2 15 12 15C9.8 15 8 13.9 8 12.5M8.5 17C9.3 17.8 10.5 18.2 12 18.2C14.2 18.2 16 17.1 16 15.7" />
                </StyledMenuIcon>
            );
        case 'point':
            return (
                <StyledMenuIcon viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="8.5" />
                    <path d="M12 8.5V15.5M9.5 10.5H14.5M9.5 13.5H14" />
                </StyledMenuIcon>
            );
        case 'store':
            return (
                <StyledMenuIcon viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 10.5H19V19.5H5V10.5ZM6.5 10.5V7.5C6.5 5.6 8.1 4 10 4H14C15.9 4 17.5 5.6 17.5 7.5V10.5M9 14H15" />
                </StyledMenuIcon>
            );
        case 'service':
            return (
                <StyledMenuIcon viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 5.5H17M7 10.5H17M7 15.5H13M5 5.5H5.01M5 10.5H5.01M5 15.5H5.01" />
                </StyledMenuIcon>
            );
        case 'designer':
            return (
                <StyledMenuIcon viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="7" cy="8" r="2" />
                    <circle cx="7" cy="16" r="2" />
                    <path d="M8.7 9.2L12 12L17.5 7.2M8.7 14.8L12 12L17.5 16.8" />
                </StyledMenuIcon>
            );
        case 'customers':
            return (
                <StyledMenuIcon viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 7H19M8 12H19M8 17H19" />
                    <circle cx="5" cy="7" r="1" fill="currentColor" stroke="none" />
                    <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
                    <circle cx="5" cy="17" r="1" fill="currentColor" stroke="none" />
                </StyledMenuIcon>
            );
        case 'member':
            return (
                <StyledMenuIcon viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="9" cy="7" r="3" />
                    <path d="M3 21V18C3 16.3 4.3 15 6 15H12C13.7 15 15 16.3 15 18V21" />
                    <path d="M16 3.1C17.3 3.6 18.2 4.8 18.2 6.3C18.2 7.8 17.3 9 16 9.5M21 21V18C21 16.4 20.1 15 18.5 14.5" />
                </StyledMenuIcon>
            );
        case 'naver':
            return (
                <StyledMenuIcon viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3.5" y="4.5" width="17" height="16" rx="3" />
                    <path d="M7.5 3.5V6.5M16.5 3.5V6.5M3.5 9H20.5" />
                    <path d="M9 14.5L11 16.5L15 12.5" />
                </StyledMenuIcon>
            );
        case 'sns':
            return (
                <StyledMenuIcon viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="5" r="2.5" />
                    <circle cx="5" cy="18" r="2.5" />
                    <circle cx="19" cy="18" r="2.5" />
                    <path d="M12 7.5V12M12 12L5 15.5M12 12L19 15.5" />
                </StyledMenuIcon>
            );
        case 'account':
            return (
                <StyledMenuIcon viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="8" r="3.5" />
                    <path d="M4 20C4 17.2 7.6 15 12 15C16.4 15 20 17.2 20 20" />
                </StyledMenuIcon>
            );
        case 'inquiry':
            return (
                <StyledMenuIcon viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="3" />
                    <path d="M3 7L12 13L21 7" />
                </StyledMenuIcon>
            );
        case 'history':
            return (
                <StyledMenuIcon viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7V12L15 15" />
                </StyledMenuIcon>
            );
        default:
            return (
                <StyledMenuIcon viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 4.5L18.5 7.5V12C18.5 15.8 15.8 19 12 19.8C8.2 19 5.5 15.8 5.5 12V7.5L12 4.5Z" />
                    <path d="M9.5 12H14.5M12 9.5V14.5" />
                </StyledMenuIcon>
            );
    }
};

export const StyledMenuIcon = styled.svg`
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    stroke: currentColor;
    fill: none;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
`;
