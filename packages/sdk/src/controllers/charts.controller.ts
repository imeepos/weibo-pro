import { Controller, Get, Query } from '@sker/core'
import type { TimeRange } from '@sker/entities';
import type {
  AgeDistributionData,
  GenderDistributionData,
  SentimentTrendData,
  GeographicData,
  EventTypeData,
  WordCloudItem,
  TimeSeriesData,
  ChartData
} from '../types'

@Controller('api/charts')
export class ChartsController {

    @Get('age-distribution')
    getAgeDistribution(@Query('timeRange') timeRange?: TimeRange): Promise<ChartData> {
        throw new Error(`method getAgeDistribution not implements`)
    }

    @Get('gender-distribution')
    getGenderDistribution(@Query('timeRange') timeRange?: TimeRange): Promise<GenderDistributionData> {
        throw new Error('method getGenderDistribution not implements')
    }

    @Get('sentiment-trend')
    getSentimentTrend(@Query('timeRange') timeRange?: TimeRange): Promise<SentimentTrendData> {
        throw new Error('method getSentimentTrend not implements')
    }

    @Get('geographic')
    getGeographic(@Query('timeRange') timeRange?: TimeRange): Promise<GeographicData> {
        throw new Error('method getGeographic not implements')
    }

    @Get('event-types')
    getEventTypes(@Query('timeRange') timeRange?: TimeRange): Promise<EventTypeData> {
        throw new Error('method getEventTypes not implements')
    }

    @Get('word-cloud')
    getWordCloud(@Query('timeRange') timeRange?: TimeRange, @Query('limit') limit?: number): Promise<WordCloudItem[]> {
        throw new Error('method getWordCloud not implements')
    }

    @Get('event-count-series')
    getEventCountSeries(@Query('timeRange') timeRange?: TimeRange): Promise<TimeSeriesData> {
        throw new Error('method getEventCountSeries not implements')
    }

    @Get('post-count-series')
    getPostCountSeries(@Query('timeRange') timeRange?: TimeRange): Promise<TimeSeriesData> {
        throw new Error('method getPostCountSeries not implements')
    }

    @Get('sentiment-data')
    getSentimentData(@Query('timeRange') timeRange?: TimeRange): Promise<{
        positive: number
        negative: number
        neutral: number
        total: number
    }> {
        throw new Error('method getSentimentData not implements')
    }

    @Get('batch')
    getBatchCharts(@Query('timeRange') timeRange?: TimeRange): Promise<{
        ageDistribution: AgeDistributionData
        genderDistribution: GenderDistributionData
        sentimentTrend: SentimentTrendData
        geographic: GeographicData
        eventTypes: EventTypeData
        wordCloud: WordCloudItem[]
    }> {
        throw new Error('method getBatchCharts not implements')
    }
}