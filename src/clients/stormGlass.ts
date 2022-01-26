import { InternalError } from '@src/util/errors/internal-error';
import config, { IConfig } from 'config';
import * as HTTPUtil from '@src/util/request';

export interface StormGlassPointSource {
    [key: string]: number;
    windSpeed: number;
}

export interface StormGlassPoint {
    readonly time: string;
    readonly waveHeight: StormGlassPointSource;
    readonly swellDirection: StormGlassPointSource;
    readonly swellHeight: StormGlassPointSource;
    readonly swellPeriod: StormGlassPointSource;
    readonly waveDirection: StormGlassPointSource;
    readonly windDirection: StormGlassPointSource;
    readonly windSpeed: StormGlassPointSource;
}

export interface StormGlassForecastResponse {
    hours: StormGlassPoint[];
}

export interface ForecastPoint {
    time: string;
    waveHeight: number;
    waveDirection: number;
    swellDirection: number;
    swellHeight: number;
    swellPeriod: number;
    windDirection: number;
    windSpeed: number;
}

/**
 * This error type is used when a request reaches out to the StormGlass API but returns an error
 */
export class StormGlassUnexpectedResponseError extends InternalError {
    constructor(message: string) {
        super(message);
    }
}

/**
 * This error type is used when something breaks before the request reaches out to the StormGlass API
 * eg: Network error, or request validation error
 */
export class ClientRequestError extends InternalError {
    constructor(message: string) {
        const internalMessage =
            'Unexpected error when trying to communicate to StormGlass';
        super(`${internalMessage}: ${message}`);
    }
}

export class StormGlassResponseError extends InternalError {
    constructor(message: string) {
        const internalMessage =
            'Unexpected error returned by the StormGlass service';
        super(`${internalMessage}: ${message}`);
    }
}

/**
 * We could have proper type for the configuration
 */
const stormGlassResourceConfig: IConfig = config.get(
    'App.resources.StormGlass'
);

export class StormGlass {
    readonly stormGlassAPIParams =
        'swellDirection,swellHeight,swellPeriod,waveDirection,waveHeight,windDirection,windSpeed';
    readonly stormGlassAPISource = 'noaa';

    constructor(protected request = new HTTPUtil.Request()) {}

    public async fetchPoints(
        lat: number,
        lng: number
    ): Promise<ForecastPoint[]> {
        try {
            const response = await this.request.get<StormGlassForecastResponse>(
                `${stormGlassResourceConfig.get(
                    'apiUrl'
                )}/weather/point?lat=${lat}&lng=${lng}&params=${
                    this.stormGlassAPIParams
                }&source=${this.stormGlassAPISource}`,
                {
                    headers: {
                        Authorization: stormGlassResourceConfig.get('apiToken'),
                    },
                }
            );
            return this.normalizedResponse(response.data);
        } catch (err: unknown) {
            /**
             * This is handling the Axios errors specifically
             */
            if (err instanceof Error && HTTPUtil.Request.isRequestError(err)) {
                const error = HTTPUtil.Request.extractErrorData(err);
                throw new StormGlassResponseError(
                    `Error: ${JSON.stringify(error.data)} Code: ${error.status}`
                );
            }

            throw new ClientRequestError(JSON.stringify(err));
        }
    }

    private normalizedResponse(
        points: StormGlassForecastResponse
    ): ForecastPoint[] {
        return points.hours
            .filter(this.isValidPoint.bind(this))
            .map((point) => ({
                swellDirection: point.swellDirection[this.stormGlassAPISource],
                swellHeight: point.swellHeight[this.stormGlassAPISource],
                swellPeriod: point.swellPeriod[this.stormGlassAPISource],
                time: point.time,
                waveDirection: point.waveDirection[this.stormGlassAPISource],
                waveHeight: point.waveHeight[this.stormGlassAPISource],
                windDirection: point.windDirection[this.stormGlassAPISource],
                windSpeed: point.windSpeed[this.stormGlassAPISource],
            }));
    }

    private isValidPoint(point: Partial<StormGlassPoint>): boolean {
        return !!(
            point.time &&
            point.swellDirection?.[this.stormGlassAPISource] &&
            point.swellHeight?.[this.stormGlassAPISource] &&
            point.swellPeriod?.[this.stormGlassAPISource] &&
            point.waveDirection?.[this.stormGlassAPISource] &&
            point.waveHeight?.[this.stormGlassAPISource] &&
            point.windDirection?.[this.stormGlassAPISource] &&
            point.windSpeed?.[this.stormGlassAPISource]
        );
    }
}