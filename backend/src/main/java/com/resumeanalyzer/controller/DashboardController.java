package com.resumeanalyzer.controller;

import com.resumeanalyzer.model.Analysis;
import com.resumeanalyzer.repository.AnalysisRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final AnalysisRepository analysisRepository;

    public DashboardController(AnalysisRepository analysisRepository) {
        this.analysisRepository = analysisRepository;
    }

    @GetMapping("/history")
    public ResponseEntity<List<Analysis>> history(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(analysisRepository.findByUserIdOrderByCreatedAtDesc(userId));
    }
}
