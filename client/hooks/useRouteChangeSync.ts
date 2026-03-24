import {useEffect} from 'react';

import {useRouter} from 'next/router';

import {isCalendar} from '../utils/router';

interface RouterChangeType {
    setRouterSlice: (v: {
        arrayRouter: Array<string | number>;
        isRootPath: boolean;
        isCalendarPath: boolean;
    }) => void;
}

export const useRouteChangeSync = ({
    setRouterSlice,
}: RouterChangeType) => {
    const router = useRouter();

    useEffect(() => {
        const getRouterState = (url: string) => {
            const array = url.split('/');

            setRouterSlice({
                arrayRouter   : array,
                isRootPath    : array.join('').length === 0,
                isCalendarPath: isCalendar(array)
            });
        };

        router.events.on('routeChangeComplete', getRouterState);
        return () => {
            router.events.off('routeChangeComplete', getRouterState);
        };
    }, []);
};
