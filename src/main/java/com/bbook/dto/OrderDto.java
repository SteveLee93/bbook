package com.bbook.dto;

import com.bbook.constant.OrderStatus;
import com.bbook.entity.Order;
import com.bbook.entity.Book;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrderDto {
	private Long bookId;
	private int count;
	private String merchantUid;
	private String impUid;
	private String imageUrl;
	private Long orderId;

	// 결제 관련 필드 추가
	private String orderName; // 주문명
	private Long totalPrice; // 배송비 포함된 최종 금액
	private Long originalPrice; // 배송비 제외한 상품 금액만
	private String email; // 주문자 이메일
	private String name; // 주문자 이름
	private String phone; // 주문자 연락처
	private String address; // 배송지 주소
	private OrderStatus orderStatus; // 주문 상태
	private Long shippingFee;

	// Order 엔티티를 OrderDto로 변환하는 정적 팩토리 메서드
	public static OrderDto of(Order order) {
		OrderDto orderDto = new OrderDto();

		// Book 정보 로깅
		Book book = order.getOrderItems().get(0).getBook();
		System.out.println("Book ID: " + book.getId());
		System.out.println("Book Title: " + book.getTitle());
		System.out.println("Book Image URL: " + book.getImageUrl());

		orderDto.setOrderName(order.getMember().getNickname() + "의 주문");
		orderDto.setBookId(book.getId());
		orderDto.setOriginalPrice(order.getOriginalPrice());
		orderDto.setTotalPrice(order.getTotalPrice());

		orderDto.setEmail(order.getMember().getEmail());
		orderDto.setName(order.getMember().getNickname());
		orderDto.setOrderStatus(order.getOrderStatus());
		orderDto.setImageUrl(book.getImageUrl());

		return orderDto;
	}
}
