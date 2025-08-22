const Question = require('../models/Question');
const animationService = require('../services/animationService');
const ttsService = require('../services/ttsService');

class JobQueue {
  constructor() {
    this.jobs = [];
    this.isProcessing = false;
    this.maxRetries = 3;
  }

  addJob(type, data) {
    const job = {
      id: Date.now() + Math.random(),
      type,
      data,
      retries: 0,
      createdAt: new Date()
    };
    
    this.jobs.push(job);
    console.log(`Job added: ${type} for question ${data.questionId}`);
    
    if (!this.isProcessing) {
      this.processJobs();
    }
  }

  async processJobs() {
    if (this.isProcessing || this.jobs.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.jobs.length > 0) {
      const job = this.jobs.shift();
      
      try {
        await this.processJob(job);
      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        
        if (job.retries < this.maxRetries) {
          job.retries++;
          this.jobs.push(job);
          console.log(`Retrying job ${job.id} (attempt ${job.retries})`);
        } else {
          console.error(`Job ${job.id} failed permanently after ${this.maxRetries} retries`);
          await this.markJobAsFailed(job);
        }
      }
    }

    this.isProcessing = false;
  }

  async processJob(job) {
    console.log(`Processing job ${job.id}: ${job.type}`);
    
    switch (job.type) {
      case 'generateVideo':
        await this.processVideoGeneration(job);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  async processVideoGeneration(job) {
    const { questionId, question, answer, language, voice } = job.data;
    
    console.log('🎬 JOB QUEUE: Starting video generation job');
    console.log(`   Question ID: ${questionId}`);
    console.log(`   Question: ${question?.substring(0, 50)}...`);
    console.log(`   Language: ${language}`);
    console.log(`   Voice: ${voice}`);
    console.log(`   Answer type: ${typeof answer}`);
    console.log(`   Answer keys: ${answer ? Object.keys(answer) : 'None'}`);
    
    try {
      // Update question status
      console.log('📝 JOB QUEUE: Updating question status to processing...');
      await Question.findByIdAndUpdate(questionId, {
        status: 'processing',
        processingStartedAt: new Date()
      });

      // Generate video
      console.log('🎬 JOB QUEUE: Calling animation service...');
      const videoResult = await animationService.generateVideo(question, answer, {
        language,
        voice
      });
      
      console.log('✅ JOB QUEUE: Video generation result:', videoResult);

      // Generate audio
      console.log('🔊 JOB QUEUE: Calling TTS service...');
      const audioResult = await ttsService.generateAudio(answer.text, language, voice);
      console.log('✅ JOB QUEUE: Audio generation result:', audioResult);

      // Update question with results
      console.log('📝 JOB QUEUE: Updating question with results...');
      await Question.findByIdAndUpdate(questionId, {
        status: 'completed',
        videoPath: videoResult.videoPath,
        audioPath: audioResult.audioPath,
        completedAt: new Date(),
        'metadata.videoGenerated': true,
        'metadata.audioGenerated': true,
        'metadata.processingTime': Date.now() - new Date(job.createdAt).getTime()
      });

      console.log(`🎉 JOB QUEUE: Video generation completed for question ${questionId}`);
    } catch (error) {
      console.error(`💥 JOB QUEUE: Video generation failed for question ${questionId}:`, error);
      throw error;
    }
  }

  async markJobAsFailed(job) {
    if (job.type === 'generateVideo') {
      await Question.findByIdAndUpdate(job.data.questionId, {
        status: 'failed',
        errorMessage: 'Video generation failed after multiple retries',
        completedAt: new Date()
      });
    }
  }

  start() {
    console.log('Job queue started');
    
    // Process jobs every 5 seconds
    setInterval(() => {
      if (!this.isProcessing && this.jobs.length > 0) {
        this.processJobs();
      }
    }, 5000);
  }

  getQueueStatus() {
    return {
      pendingJobs: this.jobs.length,
      isProcessing: this.isProcessing
    };
  }
}

module.exports = new JobQueue();
