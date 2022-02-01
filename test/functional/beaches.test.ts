import { Beach } from '@src/models/beach';
import { SetupServer as Server } from '@src/server';

describe('Beaches functional tests', () => {
    beforeAll(async () => {
        await Beach.deleteMany({});
    });
    describe('When creating a new Beach', () => {
        it('should create a beach with sucess', async () => {
            const newBeach = {
                lat: -33.792726,
                lng: 151.289824,
                name: 'Manly',
                position: 'E',
            };

            const response = await global.testRequest
                .post('/beaches')
                .send(newBeach);
            expect(response.status).toBe(201);
            //Object containing matches the keys and values, even if includes other keys such as id.
            expect(response.body).toEqual(expect.objectContaining(newBeach));
        });

        it('should return 422 when there is a validation error', async () => {
            const newBeach = {
                lat: 'invalid_string',
                lng: 151.289824,
                name: 'Manly',
                position: 'E',
            };
            const response = await global.testRequest
                .post('/beaches')
                .send(newBeach);

            expect(response.status).toBe(422);
            expect(response.body).toEqual({
                error: 'Beach validation failed: lat: Cast to Number failed for value "invalid_string" (type string) at path "lat"',
            });
        });
        it('should return 500 when there is any error other than validation error', async () => {
            const newBeach = {
                lat: -33.792726,
                lng: 151.289824,
                name: 'Manly',
                position: 'E',
            };
            await new Server().close();
            const response = await global.testRequest
                .post('/beaches')
                .send(newBeach);

            expect(response.status).toBe(500);
        });
    });
});