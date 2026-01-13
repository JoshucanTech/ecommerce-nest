import { faker } from '@faker-js/faker';

// --- Geography ---

export const LOCATIONS = {
    NIGERIA: {
        country: 'Nigeria',
        states: {
            LAGOS: {
                state: 'Lagos',
                cities: ['Ikeja', 'Lekki', 'Victoria Island', 'Surulere'],
                centers: [{ lat: 6.5244, lng: 3.3792 }]
            },
            FCT: {
                state: 'Federal Capital Territory',
                cities: ['Abuja', 'Garki', 'Wuse', 'Maitama'],
                centers: [{ lat: 9.0765, lng: 7.3986 }]
            }
        }
    },
    USA: {
        country: 'USA',
        states: {
            NY: {
                state: 'New York',
                cities: ['New York City', 'Brooklyn', 'Queens', 'Albany'],
                centers: [{ lat: 40.7128, lng: -74.0060 }]
            },
            CA: {
                state: 'California',
                cities: ['San Francisco', 'Los Angeles', 'San Diego', 'Sacramento'],
                centers: [{ lat: 37.7749, lng: -122.4194 }]
            },
            TX: {
                state: 'Texas',
                cities: ['Houston', 'Austin', 'Dallas', 'San Antonio'],
                centers: [{ lat: 30.2672, lng: -97.7431 }]
            },
            FL: {
                state: 'Florida',
                cities: ['Miami', 'Orlando', 'Tampa', 'Jacksonville'],
                centers: [{ lat: 25.7617, lng: -80.1918 }]
            }
        }
    }
};

// --- Organizations ---

export const DEPARTMENTS = [
    'Sales',
    'Customer Support',
    'Logistics',
    'Human Resources',
    'Legal',
    'Procurement'
];

export const TEAMS = [
    'Alpha',
    'Beta',
    'Gamma',
    'Customer Success',
    'Escalations',
    'Regional Operations'
];

// --- Helpers ---

export function getRandomLocation(countryCode: 'NIGERIA' | 'USA') {
    const countryData = LOCATIONS[countryCode];
    const stateKeys = Object.keys(countryData.states);
    const randomStateKey = stateKeys[Math.floor(Math.random() * stateKeys.length)];
    const stateData = countryData.states[randomStateKey];
    const randomCity = stateData.cities[Math.floor(Math.random() * stateData.cities.length)];
    const center = stateData.centers[0];

    return {
        country: countryData.country,
        state: stateData.state,
        city: randomCity,
        lat: center.lat + (Math.random() - 0.5) * 0.1, // Slight randomization
        lng: center.lng + (Math.random() - 0.5) * 0.1
    };
}

export function getRandomOrg() {
    return {
        department: DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)],
        team: TEAMS[Math.floor(Math.random() * TEAMS.length)]
    };
}
